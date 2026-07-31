async function renderPipeline(root) {
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex items-center justify-between">
        <div>
          ${eyebrow('Herramientas')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Pipeline leads</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Kanban de leads por estado</p>
        </div>
        <button onclick="renderPipeline(document.getElementById('view-root'))" class="btn-ghost flex items-center gap-1.5 text-xs">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Actualizar
        </button>
      </div>
      <div id="kanban-board" class="flex gap-3 overflow-x-auto pb-4 nice-scroll" style="min-height:500px;">
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
    { key: 'new',       label: 'Nuevos',      color: 'var(--info)',    soft: 'var(--info-soft)' },
    { key: 'contacted', label: 'Contactados',  color: '#a78bfa',        soft: 'var(--accent-soft)' },
    { key: 'qualified', label: 'Calificados',  color: 'var(--success)', soft: 'var(--success-soft)' },
    { key: 'won',       label: 'Ganados',      color: 'var(--primary)', soft: 'var(--primary-soft)' },
    { key: 'lost',      label: 'Perdidos',     color: 'var(--muted-foreground)', soft: 'var(--secondary)' },
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
      return `<div class="kanban-card rounded-xl p-3 mb-2 cursor-pointer border"
                   style="background:var(--card);border-color:var(--border);"
                   draggable="true"
                   ondragstart="this.classList.add('card-dragging');event.dataTransfer.setData('leadId','${l.id}');event.dataTransfer.setData('fromStatus','${l.status}');"
                   ondragend="this.classList.remove('card-dragging')"
                   onmouseover="this.style.borderColor='${col.color}';this.style.boxShadow='0 12px 28px -12px rgb(43 212 189 / 0.35)';"
                   onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow='';"
                   onclick='openLeadModal(${safeL})'>
        <div class="flex items-start justify-between mb-2">
          <p class="font-medium text-sm leading-tight mr-2" style="color:var(--foreground);">${l.name || 'Sin nombre'}</p>
          ${classificationBadge(l.classification)}
        </div>
        <p class="text-xs mb-2.5 truncate" style="color:var(--muted-foreground);">${sourceLabel[l.source] || l.source}</p>
        <div class="flex items-center justify-between">
          ${scoreBar(l.score)}
          <span class="font-data text-xs" style="color:var(--muted-foreground);">${daysSince}d</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="kanban-col shrink-0 w-64 flex flex-col rounded-xl p-3" data-status="${col.key}" style="background:var(--elevated);border:1px solid var(--border);"
                ondragover="event.preventDefault();this.querySelector('.kanban-drop-zone').style.background='${col.soft}';"
                ondragleave="this.querySelector('.kanban-drop-zone').style.background='';"
                ondrop="this.querySelector('.kanban-drop-zone').style.background='';_pipelineDrop(event,'${col.key}');">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" style="background:${col.color};"></div>
          <span class="eyebrow" style="color:var(--muted-foreground);">${col.label}</span>
        </div>
        <span class="font-data text-xs font-semibold px-2 py-0.5 rounded-full" style="background:${col.soft};color:${col.color};border:1px solid var(--border);">${items.length}</span>
      </div>
      <div class="kanban-drop-zone flex-1 overflow-y-auto transition-colors rounded-lg nice-scroll" style="max-height:calc(100vh - 240px);">
        ${cards || `<div class="text-xs text-center py-8 rounded-xl border-2 border-dashed" style="color:var(--muted-foreground);border-color:var(--border);">Sin leads</div>`}
      </div>
    </div>`;
  }).join('');
  hydrateMotion(board);
}

async function _pipelineDrop(event, toStatus) {
  event.preventDefault();
  const leadId     = event.dataTransfer.getData('leadId');
  const fromStatus = event.dataTransfer.getData('fromStatus');
  if (!leadId || fromStatus === toStatus) return;

  const col = event.currentTarget;
  if (col && col.classList) {
    col.classList.remove('drop-pulse');
    void col.offsetWidth;
    col.classList.add('drop-pulse');
  }

  const res = await api(`/api/leads/${leadId}/status`, { method: 'PATCH', body: { status: toStatus } });
  if (res?.ok) {
    if (toStatus === 'won' && typeof celebrate === 'function') celebrate();
    showToast(`Estado: ${statusLabel[toStatus]}`);
    renderPipeline(document.getElementById('view-root'));
  } else {
    showToast(res?.error || 'Error cambiando estado', 'error');
  }
}
