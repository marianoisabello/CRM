'use strict';

// Ficha de oportunidad (drawer lateral del diseño nuevo) con datos reales.
// Lee: GET /api/deals/:id · GET /api/activities?deal_id · GET /api/crm/users · GET /api/pipeline-stages
// Escribe con los endpoints existentes: PATCH /api/deals/:id · PATCH /api/deals/:id/stage
//   PATCH /api/contacts/:id · POST /api/activities

let _dd = { deal: null, acts: [], users: [], stages: [], dirty: false, actType: 'note', editing: null };

const _ddActivityMeta = {
  call: { icon: 'phone', color: 'var(--info)', bg: 'var(--info-soft)', label: 'Llamada' },
  email: { icon: 'mail', color: 'var(--primary)', bg: 'var(--primary-soft)', label: 'Email' },
  note: { icon: 'fileText', color: 'var(--warning)', bg: 'var(--warning-soft)', label: 'Nota' },
  task: { icon: 'checkCircle', color: '#a78bfa', bg: 'var(--accent-soft)', label: 'Tarea' },
  agent: { icon: 'bot', color: 'var(--muted-foreground)', bg: 'var(--secondary)', label: 'Agente' },
};

// Campos editables en línea: dónde viven y cómo se guardan
const _ddFields = {
  contact_name: { label: 'Contacto', get: (d) => d.contacts?.name, target: 'contact', key: 'name' },
  contact_email: { label: 'Email', get: (d) => d.contacts?.email, target: 'contact', key: 'email', type: 'email' },
  contact_phone: { label: 'Teléfono', get: (d) => d.contacts?.phone, target: 'contact', key: 'phone' },
  value: { label: 'Importe', get: (d) => d.value, target: 'deal', key: 'value', type: 'number', fmt: (v, d) => fmtMoney(v, d.currency) },
  source: { label: 'Origen', get: (d) => d.source, target: 'deal', key: 'source', fmt: (v) => sourceLabel[v] || v },
  expected_close: { label: 'Fecha de cierre', get: (d) => d.expected_close, target: 'deal', key: 'expected_close', type: 'date', fmt: (v) => fmtDay(v) },
  probability: { label: 'Probabilidad', get: (d) => d.probability, target: 'deal', key: 'probability', type: 'number', fmt: (v) => `${v}%` },
};

async function _ddLookups() {
  const needUsers = !_dd.users.length;
  const knownStages = _kanbanState.stages?.length ? _kanbanState.stages : (window._dealsData?.stages || []);
  const [usersRes, stagesRes] = await Promise.all([
    needUsers ? api('/api/crm/users') : null,
    knownStages.length ? null : api('/api/pipeline-stages'),
  ]);
  if (needUsers) _dd.users = usersRes?.users || [];
  _dd.stages = knownStages.length ? knownStages : (stagesRes?.stages || []).filter((s) => s.active !== false);
}

function _ddEnsureDom() {
  if (document.getElementById('deal-drawer')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="deal-drawer-scrim" class="dd-scrim" onclick="closeDealDrawer()" aria-hidden="true"></div>
    <aside id="deal-drawer" class="dd-panel" role="dialog" aria-modal="true" aria-label="Detalle de la oportunidad"></aside>`);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('dd-open') && !_dd.editing) closeDealDrawer();
  });
}

async function openDealDrawer(dealId) {
  _ddEnsureDom();
  const panel = document.getElementById('deal-drawer');
  panel.innerHTML = `<div class="p-6 space-y-4"><div class="skeleton h-6 w-32"></div><div class="skeleton h-10 w-64"></div><div class="skeleton h-40"></div></div>`;
  requestAnimationFrame(() => document.body.classList.add('dd-open'));
  _dd.dirty = false;
  _dd.editing = null;

  const [dealRes, actRes] = await Promise.all([
    api(`/api/deals/${dealId}`),
    api(`/api/activities?deal_id=${dealId}&limit=50`),
    _ddLookups(),
  ]);
  if (!dealRes?.deal) {
    panel.innerHTML = `<div class="p-6">${emptyState({ headline: 'Oportunidad no encontrada', body: dealRes?.error || '' })}</div>`;
    return;
  }
  _dd.deal = dealRes.deal;
  _dd.acts = actRes?.activities || [];
  _ddRender();
}

function closeDealDrawer() {
  document.body.classList.remove('dd-open');
  if (_dd.dirty && typeof _kanbanState.onChange === 'function') _kanbanState.onChange();
  _dd.dirty = false;
}

function _ddStageCols() {
  return _dealStageCols(_dd.stages);
}

function _ddRender() {
  const d = _dd.deal;
  const panel = document.getElementById('deal-drawer');
  if (!d || !panel) return;
  const cols = _ddStageCols();
  const track = cols.filter((c) => c.key !== 'perdido');
  const isWon = d.status === 'won';
  const isLost = d.status === 'lost';
  const idx = track.findIndex((c) => c.key === d.stage);
  const progress = isLost ? 0 : ((idx + 1) / Math.max(1, track.length)) * 100;
  const stageLabel = cols.find((c) => c.key === d.stage)?.label || dealStageLabel[d.stage] || d.stage;
  const company = d.companies?.name || '';
  const owner = _dd.users.find((u) => u.id === d.owner_id);
  const lead = d.leads;

  panel.innerHTML = `
    <header class="relative flex flex-col gap-5 overflow-hidden px-6 pt-6 pb-5" style="border-bottom:1px solid var(--border);">
      <span aria-hidden="true" class="pointer-events-none absolute -top-24 right-0 h-48 w-72 rounded-full" style="background:rgb(43 212 189 / 0.12);filter:blur(48px);"></span>
      <div class="relative flex items-start justify-between gap-4">
        <div class="flex flex-col gap-2 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            ${badgeHtml(_escHtml(stageLabel), isWon ? 'violet' : isLost ? 'neutral' : 'teal', 'sm')}
            ${d.expected_close ? `<span class="font-data text-[11px]" style="color:var(--muted-foreground);">Cierre ${fmtDay(d.expected_close)}</span>` : ''}
          </div>
          <h2 class="display text-3xl" style="color:var(--foreground);">${_escHtml(company || d.title || 'Oportunidad')}</h2>
          ${company ? `<p class="text-sm -mt-1" style="color:var(--muted-foreground);">${_escHtml(d.title || '')}</p>` : ''}
          <p class="display text-3xl leading-none tnum" style="color:var(--primary);">${fmtMoney(d.value, d.currency)}</p>
        </div>
        <button type="button" onclick="closeDealDrawer()" aria-label="Cerrar detalle" class="dd-icon-btn">${icon('x', 'w-4 h-4')}</button>
      </div>

      <div class="relative flex flex-col gap-2">
        <div class="h-1.5 overflow-hidden rounded-full" style="background:var(--secondary);">
          <div class="h-full rounded-full dd-progress" style="width:${progress}%;background:linear-gradient(90deg,var(--primary),var(--accent));"></div>
        </div>
        <div class="flex justify-between gap-1">
          ${track.map((c, i) => `<button type="button" class="dd-stage-btn ${!isLost && i <= idx ? 'is-done' : ''}" title="Mover a ${_escHtml(c.label)}"
              ${c.key === d.stage ? 'disabled' : `onclick="_ddMoveStage('${c.key}')"`}>${_escHtml(c.label)}</button>`).join('')}
        </div>
      </div>

      <div class="relative flex flex-wrap items-center gap-2">
        ${isWon
          ? `<div class="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold" style="border:1px solid rgb(139 92 246 / 0.25);background:var(--accent-soft);color:#a78bfa;">${icon('trophy', 'w-4 h-4')} Ganada — gran trabajo del equipo.</div>`
          : `<button type="button" class="btn-primary btn-lg" onclick="_ddWin(event)">${icon('trophy', 'w-4 h-4')} Marcar como ganada</button>`}
        ${!isLost && !isWon && cols.some((c) => c.key === 'perdido') ? `<button type="button" class="btn-ghost btn-lg" onclick="_ddMoveStage('perdido')">Marcar como perdida</button>` : ''}
        ${isLost ? `<span class="text-sm" style="color:var(--muted-foreground);">Perdida${d.lost_at ? ` ${fmtRelative(d.lost_at)}` : ''}. Movela a una etapa para reabrirla.</span>` : ''}
      </div>
    </header>

    <div class="nice-scroll flex-1 overflow-y-auto">
      <div class="grid grid-cols-1 gap-7 px-6 py-6 md:grid-cols-[minmax(0,208px)_minmax(0,1fr)]">
        <div class="flex flex-col gap-3">
          <p class="eyebrow">Detalles</p>
          ${['contact_name', 'contact_email', 'contact_phone', 'value', 'source', 'expected_close'].map(_ddFieldHtml).join('')}
          <div class="flex flex-col gap-1">
            <span class="eyebrow" style="color:var(--muted-foreground);">Responsable</span>
            <label class="dd-owner">
              ${avatarHtml(owner?.name || owner?.email || '?', { size: 24 })}
              <select onchange="_ddSave('deal',{owner_id:this.value||null})" aria-label="Responsable">
                <option value="">Sin asignar</option>
                ${_dd.users.map((u) => `<option value="${u.id}" ${u.id === d.owner_id ? 'selected' : ''}>${_escHtml(u.name || u.email)}</option>`).join('')}
              </select>
            </label>
          </div>
          ${_ddFieldHtml('probability')}
          ${lead?.id ? `<a href="${lead.status === 'won' ? `#contacts/${lead.id}` : '#leads'}" onclick="closeDealDrawer()" class="dd-link mt-1">${icon('externalLink', 'w-3.5 h-3.5')} ${lead.status === 'won' ? 'Ficha del contacto' : 'Ver lead'}</a>` : ''}
        </div>

        <div class="flex flex-col gap-3">
          <p class="eyebrow">Actividad</p>
          ${_dd.acts.length ? `<ol class="flex flex-col">${_dd.acts.map((a, i) => _ddActivityHtml(a, i === _dd.acts.length - 1)).join('')}</ol>`
            : `<p class="text-sm" style="color:var(--muted-foreground);">Todavía no hay actividad. Registrá la primera abajo.</p>`}
        </div>
      </div>
    </div>

    <footer class="flex flex-col gap-3 px-6 py-4" style="border-top:1px solid var(--border);background:var(--card);">
      <div class="flex flex-wrap gap-1.5">
        ${['call', 'email', 'note', 'task'].map((t) => {
          const m = _ddActivityMeta[t];
          const active = _dd.actType === t;
          return `<button type="button" class="dd-chip ${active ? 'is-active' : ''}" style="${active ? `background:${m.bg};color:${m.color};` : ''}" onclick="_dd.actType='${t}';_ddRender();document.getElementById('dd-act-input')?.focus()">${icon(m.icon, 'w-3.5 h-3.5')} ${m.label}</button>`;
        }).join('')}
      </div>
      <div class="flex items-center gap-2">
        <label class="flex-1">
          <span class="sr-only">Registrar una actividad</span>
          <input id="dd-act-input" class="dd-input" placeholder="Registrar ${_ddActivityMeta[_dd.actType].label.toLowerCase()}…"
            onkeydown="if(event.isComposing||event.keyCode===229)return;if(event.key==='Enter')_ddLogActivity()"
            oninput="document.getElementById('dd-act-send').disabled=!this.value.trim()">
        </label>
        <button type="button" id="dd-act-send" class="btn-primary btn-lg" style="padding-left:14px;padding-right:14px;" onclick="_ddLogActivity()" disabled aria-label="Registrar actividad">${icon('send', 'w-4 h-4')}</button>
      </div>
    </footer>`;
}

function _ddFieldHtml(field) {
  const f = _ddFields[field];
  const d = _dd.deal;
  const raw = f.get(d);
  const noContact = f.target === 'contact' && !d.contacts?.id;
  const shown = raw == null || raw === '' ? '—' : (f.fmt ? f.fmt(raw, d) : raw);
  if (_dd.editing === field) {
    const val = raw == null ? '' : String(raw).slice(0, f.type === 'date' ? 10 : undefined);
    return `<div class="flex flex-col gap-1">
      <span class="eyebrow" style="color:var(--muted-foreground);">${f.label}</span>
      <input id="dd-edit" class="dd-edit-input" type="${f.type || 'text'}" value="${_escHtml(val)}"
        onblur="_ddCommit('${field}')"
        onkeydown="if(event.isComposing||event.keyCode===229)return;if(event.key==='Enter'){event.preventDefault();this.blur();}if(event.key==='Escape'){_dd.editing=null;_ddRender();}">
    </div>`;
  }
  return `<div class="flex flex-col gap-1">
    <span class="eyebrow" style="color:var(--muted-foreground);">${f.label}</span>
    ${noContact
      ? `<span class="px-2.5 py-1.5 text-sm" style="color:var(--muted-foreground);">Sin contacto vinculado</span>`
      : `<button type="button" class="dd-field group" onclick="_ddStartEdit('${field}')">
          <span class="truncate">${_escHtml(shown)}</span>
          <span class="dd-pencil">${icon('pencil', 'w-3.5 h-3.5')}</span>
        </button>`}
  </div>`;
}

function _ddStartEdit(field) {
  _dd.editing = field;
  _ddRender();
  const el = document.getElementById('dd-edit');
  if (el) { el.focus(); if (el.select && el.type !== 'date' && el.type !== 'number') el.select(); }
}

async function _ddCommit(field) {
  if (_dd.editing !== field) return;
  const f = _ddFields[field];
  const el = document.getElementById('dd-edit');
  let v = (el?.value ?? '').trim();
  _dd.editing = null;
  const prev = f.get(_dd.deal);
  if (f.type === 'number') {
    if (v === '') { _ddRender(); return; }
    v = Number(v);
    if (!Number.isFinite(v) || v < 0 || (field === 'probability' && v > 100)) { showToast('Valor inválido', 'error'); _ddRender(); return; }
  }
  if (String(v ?? '') === String(prev ?? '').slice(0, f.type === 'date' ? 10 : undefined)) { _ddRender(); return; }
  if (v === '' && f.target === 'contact' && f.key === 'name') { _ddRender(); return; }
  await _ddSave(f.target, { [f.key]: v === '' ? null : v });
}

async function _ddSave(target, body) {
  const d = _dd.deal;
  const url = target === 'contact' ? `/api/contacts/${d.contacts?.id}` : `/api/deals/${d.id}`;
  const res = await api(url, { method: 'PATCH', body });
  if (!res?.ok) { showToast(res?.error || 'No se pudo guardar', 'error'); _ddRender(); return; }
  if (target === 'contact') Object.assign(d.contacts, body);
  else Object.assign(d, body);
  _dd.dirty = true;
  showToast('Guardado');
  _ddRender();
}

async function _ddMoveStage(stage, origin) {
  const d = _dd.deal;
  if (!d || stage === d.stage) return;
  const res = await api(`/api/deals/${d.id}/stage`, { method: 'PATCH', body: { stage } });
  if (!res?.ok) { showToast(res?.error || 'Error cambiando etapa', 'error'); return; }
  const col = _ddStageCols().find((c) => c.key === stage);
  if (col?.celebrate) celebrate(origin);
  Object.assign(d, res.deal || { stage });
  _dd.dirty = true;
  showToast(`Etapa: ${col?.label || stage}`);
  _ddRender();
}

function _ddWin(event) {
  const won = _ddStageCols().find((c) => c.celebrate);
  if (!won) { showToast('No hay una etapa de ganado configurada', 'error'); return; }
  const r = event.currentTarget.getBoundingClientRect();
  _ddMoveStage(won.key, { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight });
}

function _ddActivityHtml(a, last) {
  const m = _ddActivityMeta[a.type] || _ddActivityMeta.note;
  const author = a.agent_id ? (agentInfo[a.agent_id]?.name || a.agent_id) : (_dd.users.find((u) => u.id === a.author_user_id)?.name || '');
  return `<li class="relative flex gap-3 pb-5">
    ${last ? '' : '<span aria-hidden="true" class="absolute left-[15px] w-px" style="top:2rem;height:calc(100% - 2rem);background:var(--border);"></span>'}
    <span class="z-[1] grid place-items-center rounded-full shrink-0" style="width:32px;height:32px;background:${m.bg};color:${m.color};">${icon(m.icon, 'w-4 h-4')}</span>
    <div class="flex flex-col gap-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-semibold" style="color:var(--foreground);">${_escHtml(a.title)}</p>
        <span class="font-data text-[10px]" style="color:var(--muted-foreground);">${fmtRelative(a.occurred_at || a.created_at)}</span>
      </div>
      ${a.body ? `<p class="text-sm leading-relaxed" style="color:var(--muted-foreground);">${_escHtml(String(a.body).slice(0, 400))}</p>` : ''}
      <p class="font-data text-[10px] uppercase tracking-wide" style="color:var(--muted-foreground);">${m.label}${author ? ` · ${_escHtml(author)}` : ''}</p>
    </div>
  </li>`;
}

async function _ddLogActivity() {
  const input = document.getElementById('dd-act-input');
  const title = (input?.value || '').trim();
  const d = _dd.deal;
  if (!title || !d) return;
  const res = await api('/api/activities', {
    method: 'POST',
    body: { type: _dd.actType, title, deal_id: d.id, contact_id: d.contact_id || null, company_id: d.company_id || null, lead_id: d.lead_id || null },
  });
  if (!res?.ok) { showToast(res?.error || 'No se pudo registrar', 'error'); return; }
  _dd.acts.unshift(res.activity || { type: _dd.actType, title, occurred_at: new Date().toISOString(), author_user_id: _currentUserId() });
  _dd.dirty = true;
  _ddRender();
  document.getElementById('dd-act-input')?.focus();
}

function _currentUserId() {
  try { return JSON.parse(localStorage.getItem('crm_user') || '{}').id || null; } catch (_) { return null; }
}
