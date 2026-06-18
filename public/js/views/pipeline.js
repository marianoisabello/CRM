async function renderPipeline(root) {
  root.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold" style="color:#111827;">Pipeline</h1>
          <p class="text-sm mt-0.5" style="color:#6B7280;">Kanban de leads por estado</p>
        </div>
        <button onclick="renderPipeline(document.getElementById('view-root'))" class="btn-ghost flex items-center gap-1.5 text-xs">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Actualizar
        </button>
      </div>
      <div id="kanban-board" class="flex gap-3 overflow-x-auto pb-4" style="min-height:500px;">
        ${[1,2,3,4,5].map(() => `
          <div class="shrink-0 w-64">
            <div class="skeleton h-8 mb-3 rounded-lg"></div>
            ${[1,2,3].map(() => `<div class="skeleton h-24 mb-2 rounded-lg"></div>`).join('')}
          </div>`).join('')}
      </div>
    </div>`;

  const result = await api('/api/leads?limit=500');
  const leads = result?.leads || [];

  const columns = [
    { key: 'new',       label: 'Nuevos',      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    { key: 'contacted', label: 'Contactados',  color: '#0EA5E9', bg: '#F0F9FF', border: '#BAE6FD' },
    { key: 'qualified', label: 'Calificados',  color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
    { key: 'won',       label: 'Ganados',      color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
    { key: 'lost',      label: 'Perdidos',     color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  ];

  const grouped = {};
  columns.forEach(col => { grouped[col.key] = []; });
  leads.forEach(l => {
    if (grouped[l.status] !== undefined) grouped[l.status].push(l);
  });

  const board = document.getElementById('kanban-board');
  if (!board) return;

  board.innerHTML = columns.map(col => {
    const items = grouped[col.key] || [];
    const cards = items.map(l => {
      const daysSince = Math.floor((Date.now() - new Date(l.created_at)) / 86400000);
      const safeL = JSON.stringify(l).replace(/'/g, "&#39;");
      return `<div class="bg-white rounded-lg p-3 mb-2 cursor-pointer border transition-all"
                   style="border-color:#E5E7EB;"
                   draggable="true"
                   ondragstart="event.dataTransfer.setData('leadId','${l.id}');event.dataTransfer.setData('fromStatus','${l.status}');"
                   onmouseover="this.style.borderColor='${col.color}';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)';"
                   onmouseout="this.style.borderColor='#E5E7EB';this.style.boxShadow='';"
                   onclick='openLeadModal(${safeL})'>
        <div class="flex items-start justify-between mb-2">
          <p class="font-medium text-sm leading-tight mr-2" style="color:#111827;">${l.name || 'Sin nombre'}</p>
          ${classificationBadge(l.classification)}
        </div>
        <p class="text-xs mb-2.5 truncate" style="color:#6B7280;">${sourceLabel[l.source] || l.source}</p>
        <div class="flex items-center justify-between">
          ${scoreBar(l.score)}
          <span class="font-data text-xs" style="color:#9CA3AF;">${daysSince}d</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="kanban-col shrink-0 w-64 flex flex-col rounded-lg p-3" style="background:#F9FAFB;border:1px solid #E5E7EB;"
                ondragover="event.preventDefault();this.querySelector('.kanban-drop-zone').style.background='${col.bg}';"
                ondragleave="this.querySelector('.kanban-drop-zone').style.background='';"
                ondrop="this.querySelector('.kanban-drop-zone').style.background='';_pipelineDrop(event,'${col.key}');">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" style="background:${col.color};"></div>
          <span class="text-xs font-semibold uppercase tracking-wider" style="color:#374151;">${col.label}</span>
        </div>
        <span class="font-data text-xs font-semibold px-2 py-0.5 rounded-full" style="background:${col.bg};color:${col.color};border:1px solid ${col.border};">${items.length}</span>
      </div>
      <div class="kanban-drop-zone flex-1 overflow-y-auto transition-colors rounded-lg" style="max-height:calc(100vh - 240px);">
        ${cards || `<div class="text-xs text-center py-8 rounded-lg border-2 border-dashed" style="color:#D1D5DB;border-color:#E5E7EB;">Sin leads</div>`}
      </div>
    </div>`;
  }).join('');
}

async function _pipelineDrop(event, toStatus) {
  event.preventDefault();
  const leadId     = event.dataTransfer.getData('leadId');
  const fromStatus = event.dataTransfer.getData('fromStatus');
  if (!leadId || fromStatus === toStatus) return;

  const res = await api(`/api/leads/${leadId}/status`, { method: 'PATCH', body: { status: toStatus } });
  if (res?.ok) {
    showToast(`Estado: ${statusLabel[toStatus]}`);
    renderPipeline(document.getElementById('view-root'));
  } else {
    showToast(res?.error || 'Error cambiando estado', 'error');
  }
}
