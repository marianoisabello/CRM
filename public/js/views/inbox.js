'use strict';

let _inboxStatusFilter = 'pending';

async function renderInbox(root) {
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('CRM')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Bandeja IA</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Decisiones pendientes de agentes</p>
        </div>
        <div class="flex gap-2">
          <select id="inbox-status" onchange="_inboxStatusFilter=this.value;renderInbox(document.getElementById('view-root'))"
            class="rounded-lg px-3 py-2 text-xs"
            style="background:var(--elevated);border:1px solid var(--border);color:var(--foreground);">
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="executed">Ejecutadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="">Todas</option>
          </select>
          <button type="button" onclick="renderInbox(document.getElementById('view-root'))" class="btn-ghost text-xs">Actualizar</button>
        </div>
      </div>
      <div id="inbox-list"></div>
    </div>`;

  const sel = document.getElementById('inbox-status');
  if (sel) sel.value = _inboxStatusFilter;
  const status = _inboxStatusFilter;
  const list = document.getElementById('inbox-list');
  list.innerHTML = '<div class="skeleton h-40 rounded-xl"></div>';

  const qs = status ? `?status=${encodeURIComponent(status)}&limit=50` : '?limit=50';
  const res = await api(`/api/agent-decisions${qs}`);
  const decisions = res?.decisions || [];

  if (!decisions.length) {
    list.innerHTML = emptyState({
      headline: status === 'pending' ? 'Bandeja vacía' : 'Sin resultados',
      body: 'Las propuestas y briefings en borrador aparecen acá para aprobar.',
    });
    return;
  }

  const statusStyle = {
    pending: 'background:var(--warning-soft);color:var(--warning);border:1px solid rgb(245 177 76 / 0.3)',
    approved: 'background:var(--success-soft);color:var(--success);border:1px solid rgb(43 212 189 / 0.3)',
    executed: 'background:var(--primary-soft);color:var(--primary);border:1px solid rgb(43 212 189 / 0.35)',
    rejected: 'background:var(--secondary);color:var(--muted-foreground);border:1px solid var(--border)',
  };

  list.innerHTML = decisions.map((d) => `
    <div class="card mb-3" style="padding:16px;">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="badge" style="${statusStyle[d.status] || statusStyle.pending}">${_escHtml(d.status)}</span>
            <span class="eyebrow" style="color:var(--muted-foreground);">${_escHtml(d.agent_id)} · ${_escHtml(d.decision_type)}</span>
          </div>
          <p class="font-medium text-sm" style="color:var(--foreground);">${_escHtml(d.title)}</p>
          ${d.summary ? `<p class="text-xs mt-1" style="color:var(--muted-foreground);">${_escHtml(String(d.summary).slice(0, 200))}</p>` : ''}
          <p class="font-data text-[10px] mt-2" style="color:var(--muted-foreground);">${fmtDate(d.created_at)}</p>
        </div>
        ${d.status === 'pending' ? `
          <div class="flex gap-2 shrink-0">
            <button type="button" class="btn-primary text-xs px-3 py-1.5" onclick="_decideInbox('${d.id}','approve')">Aprobar</button>
            <button type="button" class="btn-ghost text-xs px-3 py-1.5" onclick="_decideInbox('${d.id}','reject')">Rechazar</button>
          </div>` : ''}
      </div>
    </div>`).join('');
}

async function _decideInbox(id, action) {
  const res = await api(`/api/agent-decisions/${id}/${action}`, { method: 'POST' });
  if (res?.ok) {
    showToast(action === 'approve' ? 'Decisión aprobada' : 'Decisión rechazada');
    renderInbox(document.getElementById('view-root'));
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}
