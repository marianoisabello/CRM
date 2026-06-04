/**
 * Script de seed — carga datos ficticios para demo
 * Ejecutar: node scripts/seed.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  realtime: { enabled: false },
});

const leads = [
  { source: 'web_form', name: 'Valentina García', email: 'vgarcia@empresa.com', contact: '+5491155512345', contact_type: 'phone', message: 'Necesito presupuesto urgente para campaña de Meta Ads. Tenemos lanzamiento el próximo mes y budget de $2000 mensuales.', score: 85, classification: 'hot', next_action: 'schedule_meeting', status: 'contacted', sdr_notes: 'Lead muy caliente. Tiene presupuesto definido y fecha límite. Agendar reunión esta semana.' },
  { source: 'manychat', name: 'Rodrigo Méndez', email: null, contact: '+5491166623456', contact_type: 'phone', message: '¿Trabajan con e-commerce? | Tengo una tienda de ropa y quiero escalar las ventas', score: 72, classification: 'hot', next_action: 'schedule_meeting', status: 'new', sdr_notes: 'E-commerce con intención clara de escalar. Oportunidad real.' },
  { source: 'instagram', name: 'Camila Rossi', email: 'camila.rossi@gmail.com', contact: '4521903821', contact_type: 'instagram_handle', message: '¿Tienen disponibilidad para este mes? | Vi sus casos de éxito y me interesa', score: 65, classification: 'hot', next_action: 'schedule_meeting', status: 'qualified', sdr_notes: 'Vio casos de éxito. Alta intención. Calificada en reunión de discovery.' },
  { source: 'linkedin', name: 'Martín Álvarez', email: 'malvarez@techcorp.com', contact: 'https://linkedin.com/in/martinalvarez', contact_type: 'linkedin_profile', message: 'Gerente de Marketing en TechCorp', score: 68, classification: 'hot', next_action: 'schedule_meeting', status: 'new', sdr_notes: 'Perfil senior, empresa grande. Potencial de ticket alto.' },
  { source: 'web_form', name: 'Luciana Fernández', email: 'lufer@pyme.com.ar', contact: '+5491177734567', contact_type: 'phone', message: 'Quiero información sobre sus servicios. Tengo una panadería y quiero tener presencia en redes.', score: 48, classification: 'warm', next_action: 'send_info', status: 'new', sdr_notes: 'Pyme local. Interés genuino pero presupuesto probablemente limitado. Enviar materiales primero.' },
  { source: 'manychat', name: 'Federico Torres', email: null, contact: '+5491188845678', contact_type: 'phone', message: '¿Cuánto cobran? | Quiero publicitar mi consultora de RR.HH.', score: 52, classification: 'warm', next_action: 'send_info', status: 'contacted', sdr_notes: 'Pregunta por precio directo. Consultora B2B. Enviar pricing y casos.' },
  { source: 'email', name: 'Sofía Paredes', email: 'sofia.paredes@startup.io', contact: 'sofia.paredes@startup.io', contact_type: 'email', message: '[Consulta: Servicios de Marketing Digital] Hola, somos una startup fintech en etapa seed. Buscamos agencia para estrategia digital. ¿Tienen experiencia en fintech?', score: 58, classification: 'warm', next_action: 'send_info', status: 'new', sdr_notes: 'Startup fintech. Nicho interesante. Verificar si tienen budget real.' },
  { source: 'whatsapp', name: 'Diego Molina', email: null, contact: '+5491199956789', contact_type: 'phone', message: 'Hola buenas, me recomendaron. ¿Hacen landing pages también?', score: 38, classification: 'cold', next_action: 'nurture', status: 'new', sdr_notes: 'Pregunta por servicio específico menor. Agregar a nurture con contenido de valor.' },
  { source: 'instagram', name: 'Agustina Vidal', email: null, contact: '8834920133', contact_type: 'instagram_handle', message: '¿Trabajan con artistas? | Tengo una marca personal de música independiente', score: 25, classification: 'cold', next_action: 'nurture', status: 'new', sdr_notes: 'Artista independiente. Presupuesto probable bajo. Nutrir con contenido de marca personal.' },
  { source: 'web_form', name: 'Pablo Sánchez', email: 'psanchez@negocio.com', contact: '+5491100067890', contact_type: 'phone', message: 'curiosidad', score: 15, classification: 'unqualified', next_action: 'discard', status: 'lost', sdr_notes: 'Sin intención. Mensaje vacío. Descartado.' },
  { source: 'database_import', name: 'Carolina Muñoz', email: 'carolina@grupo.com', contact: '+5491111178901', contact_type: 'phone', message: 'Ex cliente de agencia anterior. Busca nueva agencia para Q4.', score: 78, classification: 'hot', next_action: 'schedule_meeting', status: 'contacted', sdr_notes: 'Importado de base. Cliente anterior de competencia. Alta probabilidad de cierre.' },
  { source: 'linkedin', name: 'Tomás Herrera', email: 'therrera@holding.ar', contact: 'https://linkedin.com/in/tomasherrera', contact_type: 'linkedin_profile', message: 'Director Comercial en Holding Patagonia', score: 71, classification: 'hot', next_action: 'schedule_meeting', status: 'qualified', sdr_notes: 'Director en holding. Oportunidad de cuenta grande. En proceso de diagnóstico.' },
  { source: 'manychat', name: 'Florencia Ríos', email: 'frios@moda.com', contact: '+5491122289012', contact_type: 'phone', message: '¿Hacen campañas para moda? | Tengo una marca de ropa sustentable que está creciendo mucho', score: 61, classification: 'warm', next_action: 'send_info', status: 'contacted', sdr_notes: 'Moda sustentable. Nicho con buena tracción. Enviar casos del sector.' },
  { source: 'web_form', name: 'Ignacio Benitez', email: 'ibenitez@constructora.ar', contact: '+5491133390123', contact_type: 'phone', message: 'Somos constructora con 20 años de trayectoria. Queremos modernizar nuestra presencia digital y captar más leads B2B.', score: 82, classification: 'hot', next_action: 'schedule_meeting', status: 'won', sdr_notes: 'Empresa consolidada con presupuesto. CLIENTE GANADO.' },
  { source: 'email', name: 'Natalia Castro', email: 'ncastro@educacion.org', contact: 'ncastro@educacion.org', contact_type: 'email', message: '[Re: Propuesta Marketing] Gracias por la propuesta. Necesitamos aprobación del board. Les escribimos la próxima semana.', score: 55, classification: 'warm', next_action: 'nurture', status: 'contacted', sdr_notes: 'ONG de educación. Proceso de decisión largo. Seguir en nurture.' },
];

async function seed() {
  console.log('🌱 Iniciando seed de datos ficticios...');

  // 1. Crear usuario admin
  const passwordHash = await bcrypt.hash('123456', 10);
  const { error: userError } = await supabase
    .from('users')
    .upsert({ email: 'marianoisabello@pampai.com', password_hash: passwordHash, role: 'admin', name: 'Mariano' }, { onConflict: 'email' });

  if (userError) console.error('Error creando usuario:', userError.message);
  else console.log('✓ Usuario admin creado: marianoisabello@pampai.com / 123456');

  // 2. Insertar leads
  for (const lead of leads) {
    const { error } = await supabase.from('leads').insert({
      ...lead,
      raw_payload: { seed: true, original_message: lead.message },
    });
    if (error) console.error(`Error insertando lead ${lead.name}:`, error.message);
    else console.log(`✓ Lead: ${lead.name} (${lead.source}) — ${lead.classification}`);
  }

  // 3. Agregar algunos ingest events
  const { data: insertedLeads } = await supabase.from('leads').select('id, name').limit(5);
  for (const lead of insertedLeads || []) {
    await supabase.from('ingest_events').insert({
      source: 'web_form',
      raw_payload: { seed: true, name: lead.name },
      processed: true,
    });
  }

  console.log('\n✅ Seed completado!');
  console.log('🔑 Login: admin@dana.com / Dana2024!');
  console.log('🌐 Panel: http://localhost:3000/login.html');
}

seed().catch(console.error);
