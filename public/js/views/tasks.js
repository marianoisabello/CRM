'use strict';

// Tareas = tareas manuales (tabla tasks) + pendientes derivados de datos existentes:
// reuniones agendadas (meetings), aprobaciones de agentes (agent_decisions), briefings en borrador,
// seguimientos vencidos (leads hot/warm sin movimiento > 3 días) y cierres previstos de deals.
// Fuente: GET /api/crm/agenda · CRUD manual: /api/crm/tasks

let _agenda = { items: [], users: [], tasks_table: true };

const _taskKinds = {
  task: { label: 'Tarea', color: 'var(--info)' },
  meeting: { label: 'Reunión', color: 'var(--warning)' },
  approval: { label: 'Aprobación IA', color: 'var(--accent)' },
  briefing: { label: 'Briefing', color: '#a78bfa' },
  followup: { label: 'Seguimiento', color: 'var(--danger)' },
  deal_close: { label: 'Cierre previsto', color: 'var(--primary)' },
};

function _me() {
  try { return JSON.parse(localStorage.getItem('crm_user') || '{}'); } catch (_) { return {}; }
}

async function renderTasks(root) {
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('Herramientas')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Tareas</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Tus tareas + todo lo que el CRM tiene pendiente · <span id="tasks-count">…</span></p>
        </div>
        <div class="flex gap-2 no-print">
          <button type="button" class="btn-primary text-xs" onclick="openTaskForm({}, () => renderTasks(document.getElementById('view-root')))">+ Tarea</button>
          <button type="button" class="btn-ghost text-xs" onclick="renderTasks(document.getElementById('view-root'))">Actualizar</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <select id="tk-owner" class="input" style="width:auto;min-width:170px;" onchange="_renderAgenda()"></select>
        <select id="tk-due" class="input" style="width:auto;min-width:160px;" onchange="_renderAgenda()">
          <option value="">Vencimiento: todos</option>
          <option value="overdue">Vencidas</option>
          <option value="today">Hoy</option>
          <option value="week">Próximos 7 días</option>
          <option value="nodate">Sin fecha</option>
        </select>
        <select id="tk-kind" class="input" style="width:auto;min-width:170px;" onchange="_renderAgenda()">
          <option value="">Tipo: todos</option>
          ${Object.entries(_taskKinds).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
      </div>
      <div id="tasks-banner"></div>
      <div id="tasks-list"><div class="skeleton h-64 rounded-xl"></div></div>
    </div>`;

  const res = await api('/api/crm/agenda');
  if (!res?.ok) {
    document.getElementById('tasks-list').innerHTML = emptyState({ headline: 'Error cargando tareas', body: res?.error || '' });
    return;
  }
  _agenda = res;
  const me = _me();
  const sel = document.getElementById('tk-owner');
  sel.innerHTML = `<option value="">Responsable: todos</option>
    <option value="me">Mis tareas</option>
    <option value="none">Sin asignar</option>
    ${(res.users || []).filter((u) => u.id !== me.id).map((u) => `<option value="${u.id}">${_escHtml(u.name)}</option>`).join('')}`;

  if (!res.tasks_table) {
    document.getElementById('tasks-banner').innerHTML = `<div class="rounded-xl px-4 py-3 text-xs" style="background:var(--warning-soft);color:var(--warning);border:1px solid rgb(245 177 76 / 0.35);">
      Las tareas manuales necesitan la tabla <code>tasks</code> (scripts/migrations/009_tasks.sql). Mientras tanto se muestran los pendientes que el CRM ya detecta.</div>`;
  }
  _renderAgenda();
}

function _agendaFiltered() {
  const owner = document.getElementById('tk-owner')?.value || '';
  const due = document.getElementById('tk-due')?.value || '';
  const kind = document.getElementById('tk-kind')?.value || '';
  const me = _me();
  const now = new Date();
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const week = now.getTime() + 7 * 86400000;
  return (_agenda.items || []).filter((it) => {
    if (kind && it.kind !== kind) return false;
    if (owner === 'me' && it.assignee_id !== me.id) return false;
    if (owner === 'none' && it.assignee_id) return false;
    if (owner && !['me', 'none'].includes(owner) && it.assignee_id !== owner) return false;
    const t = it.due_at ? new Date(it.due_at).getTime() : null;
    if (due === 'overdue' && !it.overdue) return false;
    if (due === 'today' && !(t != null && t >= startToday && t < endToday)) return false;
    if (due === 'week' && !(t != null && t >= now.getTime() && t <= week)) return false;
    if (due === 'nodate' && t != null) return false;
    return true;
  });
}

function _renderAgenda() {
  const list = document.getElementById('tasks-list');
  if (!list) return;
  const items = _agendaFiltered();
  const countEl = document.getElementById('tasks-count');
  const overdue = items.filter((i) => i.overdue).length;
  if (countEl) countEl.innerHTML = `<span class="font-data" style="color:var(--primary);">${items.length}</span> pendientes${overdue ? ` · <span class="font-data" style="color:var(--danger);">${overdue}</span> vencidos` : ''}`;

  if (!items.length) {
    list.innerHTML = emptyState({ headline: 'Nada pendiente', body: 'No hay tareas con estos filtros. ¡Buen momento para crear una!' });
    return;
  }

  const now = new Date();
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const week = now.getTime() + 7 * 86400000;
  const groups = [
    { key: 'overdue', label: 'Vencidas', color: 'var(--danger)', test: (i) => i.overdue },
    { key: 'today', label: 'Hoy', color: 'var(--warning)', test: (i) => !i.overdue && i.due_at && new Date(i.due_at).getTime() < endToday },
    { key: 'week', label: 'Próximos 7 días', color: 'var(--info)', test: (i) => !i.overdue && i.due_at && new Date(i.due_at).getTime() >= endToday && new Date(i.due_at).getTime() <= week },
    { key: 'later', label: 'Más adelante', color: 'var(--muted-foreground)', test: (i) => !i.overdue && i.due_at && new Date(i.due_at).getTime() > week },
    { key: 'nodate', label: 'Sin fecha', color: 'var(--muted-foreground)', test: (i) => !i.due_at },
  ];

  list.innerHTML = groups.map((g) => {
    const rows = items.filter(g.test);
    if (!rows.length) return '';
    return `<section class="mb-5">
      <div class="flex items-center gap-2 mb-2">
        <span class="w-2 h-2 rounded-full" style="background:${g.color};"></span>
        <p class="eyebrow" style="color:var(--muted-foreground);">${g.label}</p>
        <span class="font-data text-xs" style="color:var(--muted-foreground);">${rows.length}</span>
      </div>
      <div class="table-shell">${rows.map((it, i) => _agendaRow(it, i)).join('')}</div>
    </section>`;
  }).join('');
}

function _agendaRow(it, i) {
  const k = _taskKinds[it.kind] || { label: it.kind, color: 'var(--muted-foreground)' };
  const check = it.can_complete
    ? `<button type="button" aria-label="Completar" class="w-5 h-5 rounded-md shrink-0 grid place-items-center transition" style="border:1.5px solid var(--border);"
         onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'"
         onclick="event.stopPropagation();_completeTask('${it.raw_id}')"></button>`
    : `<span class="w-5 h-5 shrink-0 grid place-items-center text-[11px]" style="color:${k.color};">●</span>`;
  const due = it.due_at
    ? `<span class="font-data text-[11px]" style="color:${it.overdue ? 'var(--danger)' : 'var(--muted-foreground)'};" title="${_escHtml(fmtDate(it.due_at))}">${fmtRelative(it.due_at)}</span>`
    : '';
  return `<div class="flex items-center gap-3 px-4 py-3 stagger-row ${it.href ? 'cursor-pointer' : ''}" style="border-top:${i ? '1px solid var(--border)' : 'none'};animation-delay:${Math.min(i, 12) * 0.025}s;"
      ${it.href ? `onclick="window.location.hash='${it.href}'"` : ''}
      onmouseover="this.style.background='var(--elevated)'" onmouseout="this.style.background=''">
    ${check}
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-sm font-medium truncate" style="color:var(--foreground);">${_escHtml(it.title)}</p>
        <span class="badge" style="background:var(--secondary);color:${k.color};border:1px solid var(--border);">${k.label}</span>
        ${it.priority === 'high' ? '<span class="badge badge-danger">Alta</span>' : ''}
      </div>
      ${it.subtitle ? `<p class="text-xs truncate mt-0.5" style="color:var(--muted-foreground);">${_escHtml(it.subtitle)}</p>` : ''}
    </div>
    ${it.value != null ? `<span class="font-data text-xs hidden sm:inline" style="color:var(--muted-foreground);">${fmtMoney(it.value, it.currency)}</span>` : ''}
    ${due}
    ${it.assignee ? avatarHtml(it.assignee.name, { size: 22 }) : ''}
    ${it.can_complete ? `<button type="button" aria-label="Borrar" class="text-xs opacity-50 hover:opacity-100" style="color:var(--muted-foreground);" onclick="event.stopPropagation();_deleteTask('${it.raw_id}')">✕</button>` : ''}
  </div>`;
}

async function _completeTask(id) {
  const res = await api(`/api/crm/tasks/${id}`, { method: 'PATCH', body: { done: true } });
  if (res?.ok) {
    showToast('Tarea completada ✓');
    _agenda.items = _agenda.items.filter((i) => !(i.source === 'tasks' && i.raw_id === id));
    _renderAgenda();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function _deleteTask(id) {
  if (!confirm('¿Borrar esta tarea?')) return;
  const res = await api(`/api/crm/tasks/${id}`, { method: 'DELETE' });
  if (res?.ok) {
    _agenda.items = _agenda.items.filter((i) => !(i.source === 'tasks' && i.raw_id === id));
    _renderAgenda();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

/** Form de tarea manual. prefill: { title, lead_id, deal_id, contact_id } */
async function openTaskForm(prefill = {}, onSaved) {
  const me = _me();
  let users = _agenda.users || [];
  if (!users.length) {
    const r = await api('/api/crm/users');
    users = (r?.users || []).map((u) => ({ id: u.id, name: u.name || u.email }));
  }
  window._taskFormCtx = { prefill, onSaved };
  openModalShell('Nueva tarea', prefill.lead_id ? 'Vinculada a este contacto' : 'Tarea manual', `
    <div class="space-y-3">
      <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Título</label>
        <input id="tf-title" class="input" value="${_escHtml(prefill.title || '')}" placeholder="Ej. Enviar propuesta revisada"></div>
      <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Detalle</label>
        <textarea id="tf-body" rows="2" class="input" style="resize:vertical;"></textarea></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Vence</label>
          <input id="tf-due" type="datetime-local" class="input"></div>
        <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Prioridad</label>
          <select id="tf-priority" class="input"><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baja</option></select></div>
      </div>
      <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Responsable</label>
        <select id="tf-assignee" class="input">${users.map((u) => `<option value="${u.id}" ${u.id === me.id ? 'selected' : ''}>${_escHtml(u.name)}</option>`).join('')}</select></div>
      <div class="flex gap-2 pt-1">
        <button type="button" class="btn-primary" onclick="_submitTaskForm()">Crear tarea</button>
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
      </div>
    </div>`);
  setTimeout(() => document.getElementById('tf-title')?.focus(), 50);
}

async function _submitTaskForm() {
  const ctx = window._taskFormCtx || { prefill: {} };
  const title = document.getElementById('tf-title')?.value?.trim();
  if (!title) { showToast('El título es obligatorio', 'error'); return; }
  const dueRaw = document.getElementById('tf-due')?.value;
  const body = {
    title,
    body: document.getElementById('tf-body')?.value?.trim() || null,
    due_at: dueRaw ? new Date(dueRaw).toISOString() : null,
    priority: document.getElementById('tf-priority')?.value || 'normal',
    assignee_user_id: document.getElementById('tf-assignee')?.value || null,
    lead_id: ctx.prefill.lead_id || null,
    deal_id: ctx.prefill.deal_id || null,
    contact_id: ctx.prefill.contact_id || null,
  };
  const res = await api('/api/crm/tasks', { method: 'POST', body });
  if (res?.ok) {
    closeModal();
    showToast('Tarea creada');
    if (typeof ctx.onSaved === 'function') ctx.onSaved();
  } else {
    showToast(res?.error || 'Error creando tarea', 'error');
  }
}
