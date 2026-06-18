// ─── Constantes compartidas ──────────────────────────────────────────────────

const classColors = {
  hot:         'bg-red-100 text-red-700 border border-red-200',
  warm:        'bg-amber-100 text-amber-700 border border-amber-200',
  cold:        'bg-blue-100 text-blue-700 border border-blue-200',
  unqualified: 'bg-gray-100 text-gray-500 border border-gray-200',
};
const classEmoji = { hot: '🔥', warm: '☀️', cold: '❄️', unqualified: '✗' };

const statusColors = {
  new:       'bg-blue-100 text-blue-700 border border-blue-200',
  contacted: 'bg-sky-100 text-sky-700 border border-sky-200',
  qualified: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  won:       'bg-green-100 text-green-700 border border-green-200',
  lost:      'bg-gray-100 text-gray-500 border border-gray-200',
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
  if (score === null || score === undefined) return '<span class="font-data text-xs" style="color:#9CA3AF;">—</span>';
  const color = score >= 65 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#3B82F6';
  return `<div class="flex items-center gap-1.5">
    <div class="w-14 h-1.5 rounded-full overflow-hidden" style="background:#F3F4F6;">
      <div class="h-full rounded-full" style="width:${score}%;background:${color};"></div>
    </div>
    <span class="font-data text-xs tabular-nums" style="color:#6B7280;">${score}</span>
  </div>`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function classificationBadge(c) {
  if (!c) return '<span class="text-xs" style="color:#9CA3AF;">—</span>';
  return `<span class="badge ${classColors[c]}">${classEmoji[c]} ${c}</span>`;
}

function _avatarInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

function renderLeadsTable(leads, emptyMsg = 'Sin leads') {
  if (!leads || !leads.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <svg class="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      <p class="text-sm">${emptyMsg}</p>
    </div>`;
  }
  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
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
        <tr class="lead-row transition" style="border-top:1px solid #F3F4F6;"
            onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style="background:#EFF6FF;color:#2563EB;">${_avatarInitials(l.name)}</div>
              <div class="min-w-0">
                <p class="font-medium leading-tight" style="color:#111827;">${l.name || '<span style="color:#9CA3AF;">Sin nombre</span>'}</p>
                <p class="text-xs mt-0.5 truncate max-w-[140px]" style="color:#9CA3AF;">${l.email || l.contact || ''}</p>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-xs" style="color:#6B7280;">${sourceLabel[l.source] || l.source}</td>
          <td class="px-4 py-3">${scoreBar(l.score)}</td>
          <td class="px-4 py-3">${classificationBadge(l.classification)}</td>
          <td class="px-4 py-3 text-xs" style="color:#6B7280;">${actionLabel[l.next_action] || '—'}</td>
          <td class="px-4 py-3"><span class="badge ${statusColors[l.status] || 'bg-gray-100 text-gray-500'}">${statusLabel[l.status] || l.status}</span></td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(l.created_at)}</td>
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
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Email</p>
        <p style="color:#374151;">${l.email || '<span style="color:#9CA3AF;">—</span>'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Contacto</p>
        <p style="color:#374151;">${l.contact || '<span style="color:#9CA3AF;">—</span>'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Fuente</p>
        <p style="color:#374151;">${sourceLabel[l.source] || l.source}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Score SDR</p>
        <div class="mt-1">${scoreBar(l.score)}</div>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Clasificación</p>
        <div class="mt-0.5">${classificationBadge(l.classification)}</div>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Próxima acción</p>
        <p class="text-xs" style="color:#6B7280;">${actionLabel[l.next_action] || '—'}</p>
      </div>
    </div>

    ${msgParts.length ? `
    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-3" style="color:#9CA3AF;">Conversación</p>
      <div class="space-y-2.5">
        ${msgParts.map((p, i) => `
          <div>
            <p class="text-xs mb-1" style="color:#9CA3AF;">${questions[i] || `Respuesta ${i+1}`}</p>
            <p class="text-xs rounded-lg px-3 py-2 leading-relaxed" style="background:white;border:1px solid #E5E7EB;color:#374151;">${p}</p>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${l.sdr_notes ? `
    <div class="rounded-lg p-3.5 border" style="background:#EFF6FF;border-color:#BFDBFE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#2563EB;">Análisis SDR</p>
      <p class="whitespace-pre-wrap text-xs leading-relaxed" style="color:#1E40AF;">${l.sdr_notes}</p>
    </div>` : ''}`;
}
