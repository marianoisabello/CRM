// ─── Constantes compartidas ──────────────────────────────────────────────────

const classColors = {
  hot:         'bg-red-900/40 text-red-300 border border-red-800/60',
  warm:        'bg-amber-900/40 text-amber-300 border border-amber-800/60',
  cold:        'bg-blue-900/40 text-blue-300 border border-blue-800/60',
  unqualified: 'bg-gray-800/60 text-gray-500 border border-gray-700/60',
};
const classEmoji = { hot: '🔥', warm: '☀️', cold: '❄️', unqualified: '✗' };

const statusColors = {
  new:       'bg-violet-900/40 text-violet-300 border border-violet-800/60',
  contacted: 'bg-sky-900/40 text-sky-300 border border-sky-800/60',
  qualified: 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/60',
  won:       'bg-green-900/40 text-green-300 border border-green-800/60',
  lost:      'bg-gray-800/60 text-gray-500 border border-gray-700/60',
};
const statusLabel = {
  new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado', won: 'Ganado', lost: 'Perdido',
};

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
  sdr:         { emoji: '🎯', name: 'SDR',         desc: 'Califica leads automáticamente con score determinístico y análisis IA.' },
  analyst:     { emoji: '🔍', name: 'Analista',    desc: 'Genera diagnóstico de marketing para leads post-reunión.' },
  proposal:    { emoji: '📋', name: 'Propuestas',  desc: 'Crea propuestas comerciales personalizadas para el lead.' },
  performance: { emoji: '📈', name: 'Performance', desc: 'Analiza métricas de Meta Ads y Google Ads semanalmente.' },
  reporting:   { emoji: '📊', name: 'Reporting',   desc: 'Genera reportes mensuales consolidados por cliente.' },
};

// ─── Componentes ─────────────────────────────────────────────────────────────

function scoreBar(score) {
  if (score === null || score === undefined) return '<span class="text-gray-700 text-xs">—</span>';
  const color = score >= 65 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-blue-500';
  return `<div class="flex items-center gap-1.5">
    <div class="w-14 h-1 bg-gray-800 rounded-full overflow-hidden">
      <div class="${color} h-full rounded-full" style="width:${score}%"></div>
    </div>
    <span class="text-gray-400 font-mono text-xs tabular-nums">${score}</span>
  </div>`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function classificationBadge(c) {
  if (!c) return '<span class="text-gray-700 text-xs">—</span>';
  return `<span class="badge ${classColors[c]}">${classEmoji[c]} ${c}</span>`;
}

function renderLeadsTable(leads, emptyMsg = 'Sin leads') {
  if (!leads || !leads.length) {
    return `<div class="flex flex-col items-center justify-center py-16 text-gray-600">
      <svg class="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      <p class="text-sm">${emptyMsg}</p>
    </div>`;
  }
  return `<table class="w-full text-sm">
    <thead>
      <tr class="border-b border-gray-800">
        <th class="text-left px-4 py-3">Lead</th>
        <th class="text-left px-4 py-3">Fuente</th>
        <th class="text-left px-4 py-3">Score</th>
        <th class="text-left px-4 py-3">Clasificación</th>
        <th class="text-left px-4 py-3">Acción</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${leads.map(l => `
        <tr class="lead-row border-t border-gray-800/50 cursor-pointer transition"
            onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
          <td class="px-4 py-3">
            <p class="font-medium text-gray-100 leading-tight">${l.name || '<span class="text-gray-600">Sin nombre</span>'}</p>
            <p class="text-gray-600 text-xs mt-0.5 truncate max-w-[160px]">${l.email || l.contact || ''}</p>
          </td>
          <td class="px-4 py-3 text-gray-500 text-xs">${sourceLabel[l.source] || l.source}</td>
          <td class="px-4 py-3">${scoreBar(l.score)}</td>
          <td class="px-4 py-3">${classificationBadge(l.classification)}</td>
          <td class="px-4 py-3 text-gray-500 text-xs">${actionLabel[l.next_action] || '—'}</td>
          <td class="px-4 py-3"><span class="badge ${statusColors[l.status] || 'bg-gray-800 text-gray-500'}">${statusLabel[l.status] || l.status}</span></td>
          <td class="px-4 py-3 text-gray-600 text-xs">${fmtDate(l.created_at)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderLeadDetail(l) {
  const msgParts = l.message ? l.message.split('|').map(p => p.trim()).filter(Boolean) : [];
  const questions = ['¿En qué los podemos ayudar?', '¿Qué los trajo por acá?'];

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Email</p>
        <p class="text-gray-200">${l.email || <span class="text-gray-600">—</span>}</p>
      </div>
      <div>
        <p class="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Contacto</p>
        <p class="text-gray-200">${l.contact || '<span class="text-gray-600">—</span>'}</p>
      </div>
      <div>
        <p class="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Fuente</p>
        <p class="text-gray-200">${sourceLabel[l.source] || l.source}</p>
      </div>
      <div>
        <p class="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Score SDR</p>
        <div class="mt-1">${scoreBar(l.score)}</div>
      </div>
      <div>
        <p class="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Clasificación</p>
        <div class="mt-0.5">${classificationBadge(l.classification)}</div>
      </div>
      <div>
        <p class="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Próxima acción</p>
        <p class="text-gray-400 text-xs">${actionLabel[l.next_action] || '—'}</p>
      </div>
    </div>

    ${msgParts.length ? `
    <div class="bg-gray-800/40 rounded-xl p-3.5 border border-gray-700/40">
      <p class="text-xs text-gray-600 font-medium uppercase tracking-wider mb-3">Conversación</p>
      <div class="space-y-2.5">
        ${msgParts.map((p, i) => `
          <div>
            <p class="text-xs text-gray-600 mb-1">${questions[i] || `Respuesta ${i+1}`}</p>
            <p class="text-gray-300 text-xs bg-gray-700/40 rounded-lg px-3 py-2 leading-relaxed">${p}</p>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${l.sdr_notes ? `
    <div class="bg-violet-900/10 rounded-xl p-3.5 border border-violet-800/20">
      <p class="text-xs text-violet-500 font-medium uppercase tracking-wider mb-2">Análisis SDR</p>
      <p class="text-gray-300 whitespace-pre-wrap text-xs leading-relaxed">${l.sdr_notes}</p>
    </div>` : ''}`;
}
