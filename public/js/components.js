// ─── Constantes compartidas ────────────────────────────────────────────────────

const classColors = {
  hot:         'bg-red-500/15 text-red-400 border border-red-500/30',
  warm:        'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  cold:        'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  unqualified: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
};
const classEmoji = { hot: 'HOT', warm: 'WARM', cold: 'COLD', unqualified: 'N/A' };

const statusColors = {
  new:       'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  contacted: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  qualified: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  won:       'bg-green-500/15 text-green-400 border border-green-500/30',
  lost:      'bg-gray-500/15 text-gray-500 border border-gray-500/30',
};
const statusLabel = { new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado', won: 'Ganado', lost: 'Perdido' };

const sourceColors = {
  web_form:        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  manychat:        'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  instagram:       'bg-pink-500/15 text-pink-400 border border-pink-500/30',
  whatsapp:        'bg-green-500/15 text-green-400 border border-green-500/30',
  linkedin:        'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  email:           'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  database_import: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
};

const sourceLabel = {
  web_form:        'Web Form',
  manychat:        'ManyChat',
  instagram:       'Instagram',
  whatsapp:        'WhatsApp',
  linkedin:        'LinkedIn',
  email:           'Email',
  database_import: 'Import',
};

const actionLabel = {
  schedule_meeting: 'Agendar reunion',
  send_info:        'Enviar info',
  nurture:          'Nutrir',
  discard:          'Descartar',
};

const agentInfo = {
  sdr:         { emoji: 'SDR', color: 'red', name: 'SDR', desc: 'Califica leads automaticamente con score y analisis IA.' },
  analyst:     { emoji: 'ANL', color: 'blue', name: 'Analista', desc: 'Genera diagnostico de marketing para leads calificados.' },
  proposal:    { emoji: 'PRO', color: 'violet', name: 'Propuestas', desc: 'Crea propuestas comerciales personalizadas.' },
  performance: { emoji: 'PER', color: 'emerald', name: 'Performance', desc: 'Analiza metricas de Meta Ads y Google Ads.' },
  reporting:   { emoji: 'REP', color: 'amber', name: 'Reporting', desc: 'Genera reportes mensuales por cliente.' },
};

// ─── Componentes reutilizables ─────────────────────────────────────────────────

function scoreBar(score) {
  if (!score && score !== 0) return '<span class="text-gray-600 text-[11px]">-</span>';
  const color = score >= 65 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-blue-500';
  const bgColor = score >= 65 ? 'bg-red-500/20' : score >= 40 ? 'bg-amber-500/20' : 'bg-blue-500/20';
  return `<div class="flex items-center gap-2">
    <div class="w-14 h-1.5 ${bgColor} rounded-full overflow-hidden">
      <div class="${color} h-full rounded-full transition-all duration-300" style="width:${score}%"></div>
    </div>
    <span class="text-gray-300 font-mono text-[11px] tabular-nums">${score}</span>
  </div>`;
}

function fmtDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function classificationBadge(c) {
  if (!c) return '<span class="text-[11px] text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded">Pendiente</span>';
  return `<span class="badge ${classColors[c]} text-[10px] font-semibold uppercase tracking-wide">${classEmoji[c]}</span>`;
}

function sourceBadge(source) {
  return `<span class="badge ${sourceColors[source] || 'bg-gray-500/15 text-gray-400 border border-gray-500/30'} text-[10px] font-medium">${sourceLabel[source] || source}</span>`;
}

function renderLeadsTable(leads, emptyMsg = 'Sin leads') {
  if (!leads || !leads.length) {
    return `<div class="text-center py-20 text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      <p class="text-sm">${emptyMsg}</p>
    </div>`;
  }
  return `<table class="w-full text-[13px]">
    <thead><tr class="border-b border-gray-800/80 text-gray-500 text-[11px] uppercase tracking-wider">
      <th class="text-left px-4 py-3 font-medium">Lead</th>
      <th class="text-left px-4 py-3 font-medium">Fuente</th>
      <th class="text-left px-4 py-3 font-medium">Score</th>
      <th class="text-left px-4 py-3 font-medium">Clasificacion</th>
      <th class="text-left px-4 py-3 font-medium">Accion</th>
      <th class="text-left px-4 py-3 font-medium">Estado</th>
      <th class="text-left px-4 py-3 font-medium">Fecha</th>
    </tr></thead>
    <tbody>
      ${leads.map(l => `
        <tr class="border-t border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer group"
            onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
          <td class="px-4 py-3">
            <p class="font-medium text-gray-100 group-hover:text-white transition-colors">${l.name || '<span class="text-gray-500">Sin nombre</span>'}</p>
            <p class="text-gray-500 text-[11px]">${l.email || l.contact || ''}</p>
          </td>
          <td class="px-4 py-3">${sourceBadge(l.source)}</td>
          <td class="px-4 py-3">${scoreBar(l.score)}</td>
          <td class="px-4 py-3">${classificationBadge(l.classification)}</td>
          <td class="px-4 py-3 text-gray-400 text-[11px]">${actionLabel[l.next_action] || '<span class="text-gray-600">-</span>'}</td>
          <td class="px-4 py-3"><span class="badge ${statusColors[l.status] || ''} text-[10px]">${statusLabel[l.status] || l.status}</span></td>
          <td class="px-4 py-3 text-gray-500 text-[11px] tabular-nums">${fmtDate(l.created_at)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderLeadDetail(l) {
  const questions = ['En que te podemos ayudar?', 'Que te trajo por aca?'];
  const msgParts = l.message ? l.message.split('|').map(p => p.trim()).filter(Boolean) : [];

  return `
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div class="bg-gray-800/40 rounded-lg p-3">
        <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Email</p>
        <p class="text-gray-200 text-[13px]">${l.email || '-'}</p>
      </div>
      <div class="bg-gray-800/40 rounded-lg p-3">
        <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Contacto</p>
        <p class="text-gray-200 text-[13px]">${l.contact || '-'}</p>
      </div>
      <div class="bg-gray-800/40 rounded-lg p-3">
        <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Fuente</p>
        <p class="mt-1">${sourceBadge(l.source)}</p>
      </div>
      <div class="bg-gray-800/40 rounded-lg p-3">
        <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Score SDR</p>
        <p class="mt-1">${scoreBar(l.score)}</p>
      </div>
      <div class="bg-gray-800/40 rounded-lg p-3">
        <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Clasificacion</p>
        <p class="mt-1">${classificationBadge(l.classification)}</p>
      </div>
      <div class="bg-gray-800/40 rounded-lg p-3">
        <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Proxima accion</p>
        <p class="text-gray-200 text-[13px]">${actionLabel[l.next_action] || '-'}</p>
      </div>
    </div>
    ${msgParts.length ? `
    <div class="mt-4 bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
      <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        Conversacion
      </p>
      ${msgParts.map((p, i) => `
        <div class="mb-3 last:mb-0">
          <p class="text-gray-500 text-[11px] mb-1">${questions[i] || 'Respuesta ' + (i+1)}</p>
          <p class="text-gray-200 text-[13px] bg-gray-700/40 rounded-lg px-3 py-2">${p}</p>
        </div>`).join('')}
    </div>` : ''}
    ${l.sdr_notes ? `
    <div class="mt-4 bg-violet-500/10 rounded-xl p-4 border border-violet-500/20">
      <p class="text-violet-400 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-2">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        Analisis del Agente SDR
      </p>
      <p class="text-gray-300 whitespace-pre-wrap text-[13px] leading-relaxed">${l.sdr_notes}</p>
    </div>` : ''}`;
}
