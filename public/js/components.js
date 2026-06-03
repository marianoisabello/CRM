// ─── Constantes compartidas ────────────────────────────────────────────────────

const classColors = {
  hot:         'bg-red-900/50 text-red-300 border border-red-800',
  warm:        'bg-amber-900/50 text-amber-300 border border-amber-800',
  cold:        'bg-blue-900/50 text-blue-300 border border-blue-800',
  unqualified: 'bg-gray-800 text-gray-400 border border-gray-700',
};
const classEmoji = { hot: '🔥', warm: '☀️', cold: '❄️', unqualified: '✗' };

const statusColors = {
  new:       'bg-violet-900/50 text-violet-300 border border-violet-800',
  contacted: 'bg-sky-900/50 text-sky-300 border border-sky-800',
  qualified: 'bg-emerald-900/50 text-emerald-300 border border-emerald-800',
  won:       'bg-green-900/50 text-green-300 border border-green-800',
  lost:      'bg-gray-800 text-gray-500 border border-gray-700',
};
const statusLabel = { new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado', won: 'Ganado', lost: 'Perdido' };

const sourceLabel = {
  web_form:        '🌐 Formulario web',
  manychat:        '💬 ManyChat',
  instagram:       '📸 Instagram',
  whatsapp:        '📱 WhatsApp',
  linkedin:        '💼 LinkedIn',
  email:           '✉️ Email',
  database_import: '📂 Importación',
};

const actionLabel = {
  schedule_meeting: '📅 Agendar reunión',
  send_info:        '📄 Enviar info',
  nurture:          '🌱 Nutrir',
  discard:          '🗑️ Descartar',
};

const agentInfo = {
  sdr:         { emoji: '🎯', name: 'SDR', desc: 'Califica leads automáticamente con score y análisis IA.' },
  analyst:     { emoji: '🔍', name: 'Analista', desc: 'Genera diagnóstico de marketing para leads calificados.' },
  proposal:    { emoji: '📋', name: 'Propuestas', desc: 'Crea propuestas comerciales personalizadas.' },
  performance: { emoji: '📈', name: 'Performance', desc: 'Analiza métricas de Meta Ads y Google Ads.' },
  reporting:   { emoji: '📊', name: 'Reporting', desc: 'Genera reportes mensuales por cliente.' },
};

// ─── Componentes reutilizables ─────────────────────────────────────────────────

function scoreBar(score) {
  if (!score && score !== 0) return '<span class="text-gray-600">—</span>';
  const color = score >= 65 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-blue-500';
  return `<div class="flex items-center gap-2">
    <div class="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div class="${color} h-full rounded-full" style="width:${score}%"></div>
    </div>
    <span class="text-gray-300 font-mono text-xs">${score}</span>
  </div>`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function classificationBadge(c) {
  if (!c) return '<span class="text-gray-600 text-xs">Pendiente</span>';
  return `<span class="badge ${classColors[c]}">${classEmoji[c]} ${c}</span>`;
}

function renderLeadsTable(leads, emptyMsg = 'Sin leads') {
  if (!leads || !leads.length) {
    return `<div class="text-center py-16 text-gray-500">${emptyMsg}</div>`;
  }
  return `<table class="w-full text-sm">
    <thead><tr class="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
      <th class="text-left px-4 py-3">Lead</th>
      <th class="text-left px-4 py-3">Fuente</th>
      <th class="text-left px-4 py-3">Score</th>
      <th class="text-left px-4 py-3">Clasificación</th>
      <th class="text-left px-4 py-3">Acción</th>
      <th class="text-left px-4 py-3">Estado</th>
      <th class="text-left px-4 py-3">Fecha</th>
    </tr></thead>
    <tbody>
      ${leads.map(l => `
        <tr class="border-t border-gray-800/60 hover:bg-gray-800/40 transition cursor-pointer"
            onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
          <td class="px-4 py-3">
            <p class="font-medium text-white">${l.name || '<span class="text-gray-500">Sin nombre</span>'}</p>
            <p class="text-gray-500 text-xs">${l.email || l.contact || ''}</p>
          </td>
          <td class="px-4 py-3 text-gray-400 text-xs">${sourceLabel[l.source] || l.source}</td>
          <td class="px-4 py-3">${scoreBar(l.score)}</td>
          <td class="px-4 py-3">${classificationBadge(l.classification)}</td>
          <td class="px-4 py-3 text-gray-400 text-xs">${actionLabel[l.next_action] || '—'}</td>
          <td class="px-4 py-3"><span class="badge ${statusColors[l.status] || ''}">${statusLabel[l.status] || l.status}</span></td>
          <td class="px-4 py-3 text-gray-500 text-xs">${fmtDate(l.created_at)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderLeadDetail(l) {
  const questions = ['¿En qué te podemos ayudar?', '¿Qué te trajo por acá?'];
  const msgParts = l.message ? l.message.split('|').map(p => p.trim()).filter(Boolean) : [];

  return `
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div><p class="text-gray-500 text-xs mb-0.5">Email</p><p>${l.email || '—'}</p></div>
      <div><p class="text-gray-500 text-xs mb-0.5">Contacto</p><p>${l.contact || '—'}</p></div>
      <div><p class="text-gray-500 text-xs mb-0.5">Fuente</p><p>${sourceLabel[l.source] || l.source}</p></div>
      <div><p class="text-gray-500 text-xs mb-0.5">Score SDR</p><p>${scoreBar(l.score)}</p></div>
      <div><p class="text-gray-500 text-xs mb-0.5">Clasificación</p><p>${classificationBadge(l.classification)}</p></div>
      <div><p class="text-gray-500 text-xs mb-0.5">Próxima acción</p><p class="text-xs">${actionLabel[l.next_action] || '—'}</p></div>
    </div>
    ${msgParts.length ? `
    <div class="mt-3 bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
      <p class="text-gray-500 text-xs uppercase tracking-wider mb-2">💬 Conversación</p>
      ${msgParts.map((p, i) => `
        <div class="mb-2">
          <p class="text-gray-500 text-xs mb-0.5">${questions[i] || `Respuesta ${i+1}`}</p>
          <p class="text-gray-200 text-xs bg-gray-700/50 rounded px-2 py-1">${p}</p>
        </div>`).join('')}
    </div>` : ''}
    ${l.sdr_notes ? `
    <div class="mt-2 bg-gray-800/60 rounded-lg p-3">
      <p class="text-gray-500 text-xs mb-1">🤖 Análisis del Agente SDR</p>
      <p class="text-gray-300 whitespace-pre-wrap text-xs">${l.sdr_notes}</p>
    </div>` : ''}`;
}
