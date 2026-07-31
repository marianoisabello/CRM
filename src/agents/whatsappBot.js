'use strict';

/**
 * Bot de calificación por WhatsApp directo — vía Whapi.Cloud (sin Meta ni ManyChat).
 *
 * Flujo:
 *   1. Mensaje entrante sin conversación activa + keyword de trigger → arranca el flujo.
 *   2. 10 preguntas de datos + 6 preguntas Sí/No (mismo guion que lead-scoring-chatbot).
 *   3. Al terminar: crea/actualiza el Lead y dispara el Agente SDR existente (fuente de verdad
 *      de score/classification para todo el CRM) para responder con un mensaje final acorde.
 */

const config = require('../config');
const logger = require('../lib/logger');
const whapi = require('../integrations/whapi');
const conversations = require('../db/whatsappConversations');
const { upsertLead } = require('../db/leads');
const { processLead } = require('./sdr');

const CALENDLY_LINK = 'https://calendly.com/marianoisabello-pampai/30min';

const INFO_STEPS = [
  {
    field: 'nombre_apellido',
    question:
      '¡Hola! Soy Dana, tu asistente de calificación 👋\n\nEstoy acá para conocerte mejor y ver cómo podemos ayudarte.\n\n¿Cuál es tu nombre y apellido?',
  },
  { field: 'empresa', question: '¿A qué empresa pertenecés?' },
  { field: 'cargo', question: '¿Cuál es tu cargo o posición en la empresa?' },
  { field: 'email', question: '¿Cuál es tu email de contacto?', inputType: 'email' },
  {
    field: 'whatsapp_contacto',
    question: '¿Y tu número de WhatsApp preferido para contactarte? (con código de país)',
  },
  { field: 'web_sitio', question: '¿Tenés un sitio web o blog?\n(Si no tenés, escribí "No")' },
  { field: 'red_social', question: '¿Cuál es tu red social principal?' },
  {
    field: 'tamanio_negocio',
    question: '¿Cómo describirías el tamaño de tu negocio?\n(Ej: Emprendimiento, PYME, Empresa mediana...)',
  },
  { field: 'pais_ciudad', question: '¿De qué país y ciudad sos?' },
  {
    field: 'objetivo_necesidad',
    question: '¡Ya casi terminamos con esta parte! 🙌\n\n¿Cuál es tu objetivo o necesidad principal en este momento?',
  },
];

const SCORING_QUESTIONS = [
  '¿Tenés un negocio activo en este momento?',
  '¿Tenés presupuesto disponible para invertir en marketing/ventas?',
  '¿Tomás decisiones directas o influís en las decisiones de compra?',
  '¿Tenés una necesidad real y urgente que necesitás resolver ahora?',
  '¿Trabajás con otros proveedores o lo hacés todo internamente?',
  '¿Estás buscando resultados en el corto plazo (próximas semanas)?',
];

function scoringIntro(nombre) {
  return `Perfecto, ${nombre}! 🎯\n\nAhora te haré 6 preguntas rápidas de Sí o No para entender mejor tu situación actual. Respondé con *Sí* o *No*.`;
}

function shouldTrigger(text) {
  const normalized = text.toLowerCase();
  return config.whatsappBot.triggerKeywords.some((k) => normalized.includes(k));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseYesNo(text) {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // quita acentos: "sí" -> "si"

  if (/^(si|s|yes|y|1|dale|claro)\b/.test(normalized)) return true;
  if (/^(no|n|nel|2)\b/.test(normalized)) return false;
  return null;
}

function calculateScore(answers) {
  let score = 0;
  if (answers.respuesta_q1) score += 10;

  const hasWeb =
    answers.web_sitio && answers.web_sitio.toLowerCase() !== 'no' && answers.web_sitio.trim().length > 2;
  const hasSocial =
    answers.red_social && answers.red_social.toLowerCase() !== 'no' && answers.red_social.trim().length > 2;
  if (hasWeb || hasSocial) score += 10;

  if (answers.respuesta_q4) score += 20;
  if (answers.respuesta_q2) score += 20;
  if (answers.respuesta_q3) score += 20;
  if (answers.respuesta_q6) score += 20;
  return score;
}

function getCategory(score) {
  if (score >= 70) return 'Alto';
  if (score >= 40) return 'Medio';
  return 'Bajo';
}

function buildLeadMessage(answers) {
  return [
    answers.objetivo_necesidad,
    answers.cargo ? `Cargo: ${answers.cargo}` : null,
    answers.empresa ? `Empresa: ${answers.empresa}` : null,
    answers.tamanio_negocio ? `Tamaño de negocio: ${answers.tamanio_negocio}` : null,
  ]
    .filter(Boolean)
    .join('. ');
}

function buildFinalMessage(category, sdrResult) {
  const classification = sdrResult?.classification;

  if (classification === 'hot' || (!classification && category === 'Alto')) {
    const link = sdrResult?.scheduling_link || CALENDLY_LINK;
    return `¡Excelente! Vemos una gran alineación entre lo que necesitás y lo que ofrecemos 🙌\n\nMe encantaría agendar una breve reunión para conocerte mejor. Reservá el horario que más te convenga acá: ${link}`;
  }

  if (classification === 'warm' || (!classification && category === 'Medio')) {
    return 'Tu perfil es muy interesante y vemos mucho potencial 💡\n\nVamos a mantenernos en contacto y enviarte contenido valioso. ¡Gracias por tu tiempo!';
  }

  return 'Gracias por contarnos sobre tu situación 🙏\n\nEn este momento no parece ser el momento ideal, pero te vamos a compartir contenido educativo y nos encantaría reconectar más adelante.';
}

async function handleInfoAnswer(convo, text) {
  const current = INFO_STEPS[convo.step];

  if (current.inputType === 'email' && !isValidEmail(text)) {
    await whapi.sendText(convo.phone, 'Ese email no parece válido 🤔 ¿Podés escribirlo de nuevo?');
    return;
  }

  const answers = { ...convo.answers, [current.field]: text };
  const nextStep = convo.step + 1;
  await conversations.updateProgress(convo.id, { step: nextStep, answers });

  if (nextStep < INFO_STEPS.length) {
    await whapi.sendText(convo.phone, INFO_STEPS[nextStep].question);
    return;
  }

  const firstName = (answers.nombre_apellido || '').trim().split(' ')[0] || 'ahí';
  await whapi.sendText(convo.phone, scoringIntro(firstName));
  await whapi.sendText(convo.phone, SCORING_QUESTIONS[0]);
}

async function handleScoringAnswer(convo, text) {
  const answer = parseYesNo(text);
  if (answer === null) {
    await whapi.sendText(convo.phone, 'Perdón, no entendí 🙏 Respondé con *Sí* o *No*.');
    return;
  }

  const questionIndex = convo.step - INFO_STEPS.length;
  const key = `respuesta_q${questionIndex + 1}`;
  const answers = { ...convo.answers, [key]: answer };
  const nextStep = convo.step + 1;
  await conversations.updateProgress(convo.id, { step: nextStep, answers });

  const nextQuestionIndex = questionIndex + 1;
  if (nextQuestionIndex < SCORING_QUESTIONS.length) {
    await whapi.sendText(convo.phone, SCORING_QUESTIONS[nextQuestionIndex]);
    return;
  }

  await finishConversation(convo.id, convo.phone, answers);
}

async function finishConversation(convoId, phone, answers) {
  const score = calculateScore(answers);
  const category = getCategory(score);

  const { lead } = await upsertLead({
    source: 'whatsapp',
    external_id: phone,
    name: answers.nombre_apellido || null,
    email: answers.email || null,
    contact: phone,
    contact_type: 'phone',
    message: buildLeadMessage(answers),
    company_name: answers.empresa ? String(answers.empresa).trim() : null,
    raw_payload: { channel: 'whapi_bot', answers, score_chatbot: score, categoria_chatbot: category },
  });

  await conversations.complete(convoId, lead.id);

  await whapi.sendText(
    phone,
    '¡Listo! Respondiste todas las preguntas 🎉\n\nDejame un segundo que reviso todo...'
  );

  let sdrResult = null;
  try {
    sdrResult = await processLead(lead);
  } catch (err) {
    logger.error({ msg: 'Error corriendo SDR tras bot de WhatsApp', leadId: lead.id, error: err.message });
  }

  await whapi.sendText(phone, buildFinalMessage(category, sdrResult));
}

/**
 * Punto de entrada desde el webhook de Whapi.
 * @param {Object} opts
 * @param {string} opts.phone - Número del remitente (con código de país)
 * @param {string} opts.text - Texto del mensaje entrante
 * @param {string} [opts.contactName] - Nombre de perfil de WhatsApp, si viene en el payload
 */
async function handleIncomingMessage({ phone, text, contactName }) {
  const trimmed = (text || '').trim();
  if (!phone || !trimmed) return;

  const convo = await conversations.getActive(phone);

  if (!convo) {
    if (!shouldTrigger(trimmed)) {
      logger.info({ msg: 'Mensaje de WhatsApp sin keyword de trigger, ignorado', phone });
      return;
    }
    await conversations.create(phone, contactName);
    await whapi.sendText(phone, INFO_STEPS[0].question);
    return;
  }

  if (convo.step < INFO_STEPS.length) {
    await handleInfoAnswer(convo, trimmed);
  } else {
    await handleScoringAnswer(convo, trimmed);
  }
}

module.exports = { handleIncomingMessage };
