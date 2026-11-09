'use strict';
/**
 * Datos sintéticos para ver el CRM con empresas, contactos y oportunidades.
 *
 *   node scripts/demo-data.js seed    → borra la demo anterior y la vuelve a crear
 *   node scripts/demo-data.js clean   → borra solo la demo
 *
 * Todo lo que crea queda marcado para poder borrarlo sin tocar datos reales:
 *   leads.source = 'demo' · deals.source = 'demo' · companies.notes empieza con '[DEMO]'
 *   contactos con email @demo.example.com (dominio reservado, nunca recibe correo)
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const DEMO_DOMAIN = 'demo.example.com';
const DAY = 864e5;
const now = Date.now();
const ago = (d, h = 10) => new Date(now - d * DAY + (h - 12) * 36e5).toISOString();
const ahead = (d) => new Date(now + d * DAY).toISOString();
const dateOnly = (iso) => iso.slice(0, 10);

const COMPANIES = [
  { name: 'Aura Moda', industry: 'Retail / Moda', size: '11-50', city: 'Buenos Aires', website: 'auramoda.demo' },
  { name: 'NexaPay', industry: 'Fintech', size: '51-200', city: 'Córdoba', website: 'nexapay.demo' },
  { name: 'Clínica Del Parque', industry: 'Salud', size: '51-200', city: 'Rosario', website: 'clinicadelparque.demo' },
  { name: 'Verde Hogar', industry: 'Construcción', size: '11-50', city: 'Mendoza', website: 'verdehogar.demo' },
  { name: 'Ruta Sur Travel', industry: 'Turismo', size: '1-10', city: 'Bariloche', website: 'rutasur.demo' },
  { name: 'Lumen Estudio', industry: 'Arquitectura', size: '1-10', city: 'Buenos Aires', website: 'lumen.demo' },
  { name: 'Grano Café', industry: 'Gastronomía', size: '11-50', city: 'La Plata', website: 'granocafe.demo' },
  { name: 'Delta Logística', industry: 'Logística', size: '201-500', city: 'Campana', website: 'deltalog.demo' },
  { name: 'Kairo Fitness', industry: 'Deporte', size: '11-50', city: 'Montevideo', website: 'kairo.demo' },
  { name: 'Orbe Software', industry: 'Tecnología', size: '51-200', city: 'Buenos Aires', website: 'orbe.demo' },
];

// [nombre, cargo, empresa (índice), fuente original, días desde que entró]
const CONTACTS = [
  ['Lucía Martínez', 'Directora de Marketing', 0, 'instagram', 140],
  ['Sofía Nguyen', 'CMO', 1, 'linkedin', 120],
  ['Martín Díaz', 'CEO', 1, 'web_form', 95],
  ['Paula Ferreyra', 'Gerente General', 2, 'whatsapp', 110],
  ['Diego Romero', 'Socio', 3, 'manychat', 80],
  ['Valentina Sosa', 'Fundadora', 4, 'instagram', 70],
  ['Joaquín Herrera', 'Arquitecto socio', 5, 'email', 60],
  ['Camila Ríos', 'Dueña', 6, 'whatsapp', 55],
  ['Tomás Benítez', 'Gerente Comercial', 7, 'linkedin', 50],
  ['Agustina Vega', 'Jefa de Marketing', 7, 'web_form', 45],
  ['Federico Paz', 'Director', 8, 'manychat', 35],
  ['Julieta Morales', 'Head of Growth', 9, 'linkedin', 30],
  ['Nicolás Ortiz', 'CTO', 9, 'email', 25],
  ['Renata López', 'Coordinadora', 2, 'web_form', 20],
];

// [contacto (índice), título, valor USD, etapa, días en la etapa, cierre previsto en días]
const DEALS = [
  [0, 'Estrategia 360 + contenido mensual', 4500, 'negociacion', 6, 12],
  [1, 'Campañas de performance Q1', 6800, 'propuesta', 9, 25],
  [2, 'Rediseño web y embudo', 3200, 'prospeccion', 3, 40],
  [3, 'Captación de pacientes en redes', 5200, 'ganado', 4, null],
  [4, 'Lanzamiento línea sustentable', 2900, 'propuesta', 14, 20],
  [5, 'Gestión de Instagram y reels', 1500, 'ganado', 12, null],
  [6, 'Branding + portfolio digital', 2400, 'prospeccion', 2, 35],
  [7, 'Pauta local y Google Maps', 1200, 'perdido', 18, null],
  [8, 'Generación de leads B2B', 9500, 'negociacion', 11, 8],
  [9, 'Automatización de email marketing', 2100, 'ganado', 33, null],
  [10, 'Campaña de verano', 1800, 'propuesta', 5, 15],
  [11, 'Programa de growth trimestral', 12000, 'negociacion', 3, 18],
  [12, 'Landing para producto SaaS', 3600, 'ganado', 41, null],
  [13, 'Chatbot de turnos', 2700, 'prospeccion', 1, 45],
  [1, 'Retainer de contenido', 1900, 'ganado', 65, null],
  [5, 'Campaña de temporada alta', 2200, 'perdido', 40, null],
];

const PROB = { prospeccion: 20, propuesta: 45, negociacion: 70, ganado: 100, perdido: 0 };
const ACT_TEMPLATES = [
  ['call', 'Llamada de descubrimiento', 'Repasamos objetivos y presupuesto.'],
  ['email', 'Envío de propuesta', 'Mandamos la propuesta con dos alternativas de alcance.'],
  ['note', 'Nota interna', 'Decide junto con el socio; pide casos del rubro.'],
  ['call', 'Seguimiento', 'Pidió ajustar el fee mensual.'],
  ['task', 'Preparar reporte inicial', null],
];

function slug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
}

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function clean() {
  const leads = await must(db.from('leads').select('id').eq('source', 'demo'), 'leer leads demo');
  const leadIds = leads.map((l) => l.id);
  const deals = await must(db.from('deals').select('id').eq('source', 'demo'), 'leer deals demo');
  const dealIds = deals.map((d) => d.id);
  const companies = await must(db.from('companies').select('id').like('notes', '[DEMO]%'), 'leer empresas demo');
  const companyIds = companies.map((c) => c.id);
  const contacts = await must(db.from('contacts').select('id').like('email', `%@${DEMO_DOMAIN}`), 'leer contactos demo');
  const contactIds = contacts.map((c) => c.id);

  const del = async (table, col, ids) => {
    if (!ids.length) return;
    await must(db.from(table).delete().in(col, ids), `borrar ${table}.${col}`);
  };
  for (const t of ['tasks', 'activities']) {
    await del(t, 'deal_id', dealIds);
    await del(t, 'contact_id', contactIds);
    await del(t, 'lead_id', leadIds);
  }
  await del('meetings', 'lead_id', leadIds);
  await del('clients', 'lead_id', leadIds).catch(() => {});
  await del('deals', 'id', dealIds);
  if (leadIds.length) {
    await must(db.from('leads').update({ converted_contact_id: null, converted_deal_id: null, company_id: null }).in('id', leadIds), 'desvincular leads');
  }
  await del('contacts', 'id', contactIds);
  await del('leads', 'id', leadIds);
  await del('companies', 'id', companyIds);
  console.log(`Demo borrada: ${leadIds.length} leads, ${contactIds.length} contactos, ${companyIds.length} empresas, ${dealIds.length} oportunidades.`);
}

async function seed() {
  await clean();
  const users = await must(db.from('users').select('id, name').order('created_at'), 'leer usuarios');
  const owner = (i) => users[i % users.length]?.id || null;

  const companies = await must(db.from('companies').insert(COMPANIES.map((c, i) => ({
    ...c, website: `https://${c.website}`, owner_id: owner(i), notes: '[DEMO] Empresa de ejemplo',
    created_at: ago(150 - i * 8),
  }))).select('id, name'), 'crear empresas');

  const leadRows = CONTACTS.map(([name, cargo, ci, source, days], i) => {
    const email = `${slug(name)}@${DEMO_DOMAIN}`;
    return {
      source: 'demo', external_id: `demo-${i + 1}`, name, nombre_apellido: name, email,
      contact: email, contact_type: 'email', status: 'won', classification: i % 3 ? 'warm' : 'hot',
      score: 60 + ((i * 7) % 35), cargo, empresa: COMPANIES[ci].name, company_name: COMPANIES[ci].name,
      message: `Lead de ejemplo (llegó por ${source}).`, raw_payload: { demo: true, original_source: source },
      created_at: ago(days), updated_at: ago(Math.max(1, days - 20)),
    };
  });
  const leads = await must(db.from('leads').insert(leadRows).select('id, email'), 'crear leads');

  const contacts = await must(db.from('contacts').insert(CONTACTS.map(([name, cargo, ci, , days], i) => ({
    lead_id: leads[i].id, company_id: companies[ci].id, name, email: leads[i].email,
    phone: `+54 9 11 5${String(100000 + i * 7331).slice(0, 6)}`, role: cargo, owner_id: owner(i),
    created_at: ago(days - 2),
  }))).select('id, lead_id, company_id'), 'crear contactos');

  for (let i = 0; i < leads.length; i++) {
    await must(db.from('leads').update({ converted_contact_id: contacts[i].id, company_id: contacts[i].company_id }).eq('id', leads[i].id), 'vincular lead');
  }

  const dealRows = DEALS.map(([ci, title, value, stage, inStage, closeIn], i) => {
    const c = contacts[ci];
    const status = stage === 'ganado' ? 'won' : stage === 'perdido' ? 'lost' : 'open';
    const entered = ago(inStage, 9 + (i % 6));
    return {
      title, value, currency: 'USD', stage, probability: PROB[stage], status,
      expected_close: closeIn != null ? dateOnly(ahead(closeIn)) : null,
      stage_entered_at: entered, contact_id: c.id, company_id: c.company_id, lead_id: c.lead_id,
      owner_id: owner(ci), source: 'demo',
      won_at: status === 'won' ? entered : null, lost_at: status === 'lost' ? entered : null,
      notes: status === 'lost' ? 'Eligió otra agencia por precio.' : null,
      created_at: ago(inStage + 15 + (i % 10)),
    };
  });
  const deals = await must(db.from('deals').insert(dealRows).select('id, contact_id, company_id, lead_id, owner_id, stage'), 'crear oportunidades');

  for (const d of deals) {
    await must(db.from('leads').update({ converted_deal_id: d.id }).eq('id', d.lead_id).is('converted_deal_id', null), 'vincular deal');
  }

  const activities = [];
  deals.forEach((d, i) => {
    const n = 2 + (i % 3);
    for (let k = 0; k < n; k++) {
      const [type, title, body] = ACT_TEMPLATES[(i + k) % ACT_TEMPLATES.length];
      activities.push({
        type, title, body, deal_id: d.id, contact_id: d.contact_id, company_id: d.company_id, lead_id: d.lead_id,
        author_user_id: d.owner_id, occurred_at: ago(k === 0 && i % 4 === 0 ? 0 : 2 + k * 6 + i, 10 + k),
      });
    }
  });
  await must(db.from('activities').insert(activities), 'crear actividades');

  const open = deals.filter((d) => !['ganado', 'perdido'].includes(d.stage));
  const tasks = open.slice(0, 6).map((d, i) => ({
    title: ['Enviar propuesta ajustada', 'Llamar para cerrar fecha', 'Mandar casos de éxito', 'Agendar reunión con el socio', 'Revisar presupuesto', 'Confirmar alcance'][i],
    due_at: i < 2 ? ago(i + 1) : ahead(i), priority: i === 0 ? 'high' : 'normal',
    assignee_user_id: d.owner_id, created_by: d.owner_id, deal_id: d.id, contact_id: d.contact_id,
    company_id: d.company_id, lead_id: d.lead_id,
  }));
  const tasksOk = await db.from('tasks').insert(tasks);
  if (tasksOk.error) console.warn('Tareas no creadas:', tasksOk.error.message);

  const meetings = open.slice(0, 3).map((d, i) => ({
    lead_id: d.lead_id, scheduled_at: ahead(i + 1), type: ['follow_up', 'closing', 'discovery'][i],
    status: 'scheduled', notes: 'Reunión de ejemplo (demo).',
  }));
  await must(db.from('meetings').insert(meetings), 'crear reuniones');

  console.log(`Demo creada: ${companies.length} empresas, ${contacts.length} contactos (leads ganados), ${deals.length} oportunidades, ${activities.length} actividades, ${tasksOk.error ? 0 : tasks.length} tareas, ${meetings.length} reuniones.`);
}

const cmd = process.argv[2];
(cmd === 'seed' ? seed() : cmd === 'clean' ? clean() : Promise.reject(new Error('Uso: node scripts/demo-data.js seed|clean')))
  .catch((e) => { console.error(e.message); process.exit(1); });
