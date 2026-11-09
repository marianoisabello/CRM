'use strict';

// Interfaz del diseño nuevo (crm-dashboard-new-design): sidebar, barra superior,
// buscador global, notificaciones y widget de objetivo. El CRM real (leads,
// agentes, herramientas) se incorpora como bloque secundario del mismo sidebar.

const SHELL_PRIMARY = [
  { view: 'dashboard', label: 'Panel', icon: 'dashboard' },
  { view: 'deals', label: 'Pipeline', icon: 'zap', badge: 'nb-pipeline' },
  { view: 'contacts', label: 'Contactos', icon: 'users' },
  { view: 'companies', label: 'Empresas', icon: 'building' },
  { view: 'mail', label: 'Bandeja', icon: 'inbox', badge: 'nb-bandeja', aliases: ['inbox'] },
  { view: 'tasks', label: 'Tareas', icon: 'calendarCheck' },
  { view: 'reports', label: 'Informes', icon: 'chart' },
];

const SHELL_GROUPS = [
  {
    id: 'leads', label: 'Leads', icon: 'userPlus',
    items: [
      ['leads', 'Todos'], ['leads/web_form', 'Formulario web'], ['leads/manychat', 'ManyChat'], ['leads/instagram', 'Instagram'],
      ['leads/whatsapp', 'WhatsApp'], ['leads/linkedin', 'LinkedIn'], ['leads/email', 'Email'], ['leads/database_import', 'Importación'],
      ['pipeline', 'Pipeline de leads'],
    ],
  },
  {
    id: 'agentes', label: 'Agentes IA', icon: 'bot',
    items: [
      ['agent/sdr', 'SDR'], ['agent/analyst', 'Analista'], ['agent/reuniones', 'Reuniones'], ['agent/briefing', 'Briefing'],
      ['propuestas', 'Propuestas'], ['agent/proposal', 'Propuestas IA'], ['agent/performance', 'Performance'], ['agent/reporting', 'Reporting'],
    ],
  },
  {
    id: 'mas', label: 'Herramientas', icon: 'wrench',
    items: [['activities', 'Actividades'], ['calendar', 'Calendario'], ['chatbox', 'Chatbox · Lead scoring']],
  },
];

const SHELL_TITLES = {
  dashboard: 'Panel comercial', deals: 'Pipeline', contacts: 'Contactos', companies: 'Empresas', mail: 'Bandeja', inbox: 'Bandeja',
  tasks: 'Tareas', reports: 'Informes', leads: 'Leads', pipeline: 'Pipeline de leads', activities: 'Actividades',
  calendar: 'Calendario', chatbox: 'Chatbox', settings: 'Configuración', propuestas: 'Propuestas', agent: 'Agentes IA',
};

function _shellUser() {
  try { return JSON.parse(localStorage.getItem('crm_user') || '{}'); } catch (_) { return {}; }
}

function _shellQuarterLabel() {
  const now = new Date();
  return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
}

function _shellLogo(size = 36) {
  return `<span aria-hidden="true" class="grid shrink-0 place-items-center rounded-full" style="width:${size}px;height:${size}px;background:linear-gradient(135deg,var(--primary),var(--accent));">
    <span class="grid place-items-center rounded-full display" style="width:${size - 6}px;height:${size - 6}px;background:var(--sidebar);color:var(--primary);font-size:${Math.round(size * 0.44)}px;line-height:1;">D</span>
  </span>`;
}

function renderShell() {
  const u = _shellUser();
  const name = u.name || u.email || 'Usuario';
  const role = u.role === 'admin' ? 'Administrador' : (u.role || 'Equipo comercial');

  document.getElementById('crm-sidebar').innerHTML = `
    <div class="flex h-full flex-col justify-between gap-6 px-4 py-6">
      <div class="flex min-h-0 flex-col gap-8">
        <a href="#dashboard" class="flex items-center gap-3 px-1" style="text-decoration:none;">
          ${_shellLogo()}
          <span class="flex flex-col leading-tight">
            <span class="display text-lg" style="color:var(--sidebar-foreground);">Dana<span style="color:var(--primary);">.</span></span>
            <span class="eyebrow" style="color:var(--sidebar-muted);">CRM Pampai</span>
          </span>
        </a>

        <div class="sb-scroll nice-scroll flex min-h-0 flex-col gap-8">
          <nav aria-label="Principal" class="flex flex-col gap-1" id="crm-sidebar-nav">
            ${SHELL_PRIMARY.map((it) => `
              <a href="#${it.view}" class="sb-item" data-view="${it.view}" data-aliases="${(it.aliases || []).join(',')}">
                ${icon(it.icon, 'w-[18px] h-[18px]')}
                <span class="flex-1 text-left">${it.label}</span>
                ${it.badge ? `<span class="sb-badge" id="${it.badge}" hidden></span>` : ''}
              </a>`).join('')}
          </nav>

          <button type="button" id="sb-quarter" class="gradient-ring sb-quarter" onclick="openQuarterTargetForm()">
            <div class="flex items-center justify-between"><span class="eyebrow" style="color:var(--sidebar-muted);">Objetivo ${_shellQuarterLabel().split(' ')[0]}</span><span class="font-data text-xs" style="color:var(--primary);">…</span></div>
            <div class="h-1.5 overflow-hidden rounded-full" style="background:#22222e;"><div class="h-full rounded-full" style="width:0%;"></div></div>
            <p class="text-xs leading-relaxed text-left" style="color:var(--sidebar-muted);">Cargando objetivo…</p>
          </button>

          <nav aria-label="IA" class="flex flex-col gap-1" id="crm-sidebar-more">
            <p class="eyebrow px-4 pb-1" style="color:var(--sidebar-muted);font-size:10px;">IA</p>
            ${SHELL_GROUPS.map((g) => `
              <div class="sb-group" id="nav-group-${g.id}">
                <button type="button" class="sb-item sb-group-toggle" onclick="toggleNavGroup('${g.id}')" aria-expanded="false">
                  ${icon(g.icon, 'w-[18px] h-[18px]')}
                  <span class="flex-1 text-left">${g.label}</span>
                  <span class="sb-chevron">${icon('chevronDown', 'w-4 h-4')}</span>
                </button>
                <div class="sb-children">
                  ${g.items.map(([view, label]) => `<a href="#${view}" class="sb-sub" data-view="${view}">${label}</a>`).join('')}
                </div>
              </div>`).join('')}
            <a href="#settings" class="sb-item" data-view="settings">${icon('settings', 'w-[18px] h-[18px]')}<span class="flex-1 text-left">Configuración</span></a>
          </nav>
        </div>
      </div>

      <div class="relative">
        <button type="button" class="sb-user" onclick="toggleUserMenu()" aria-haspopup="menu" aria-expanded="false" id="sb-user-btn">
          ${avatarHtml(name, { size: 34 })}
          <span class="flex flex-1 flex-col leading-tight min-w-0 text-left">
            <span class="text-sm font-semibold truncate" style="color:var(--sidebar-foreground);">${_escHtml(name)}</span>
            <span class="text-[11px] truncate" style="color:var(--sidebar-muted);">${_escHtml(role)}</span>
          </span>
          <span style="color:var(--sidebar-muted);">${icon('chevronsUpDown', 'w-4 h-4')}</span>
        </button>
        <div id="sb-user-menu" class="ds-popover" role="menu" hidden style="bottom:calc(100% + 8px);left:0;right:0;">
          <p class="px-3 pt-2 pb-1 text-[11px] truncate" style="color:var(--muted-foreground);">${_escHtml(u.email || '')}</p>
          <a href="#settings" class="ds-menu-item" role="menuitem" onclick="toggleUserMenu(false)">${icon('settings', 'w-4 h-4')} Configuración</a>
          <button type="button" class="ds-menu-item" role="menuitem" onclick="logout()" style="color:var(--danger);">${icon('logOut', 'w-4 h-4')} Cerrar sesión</button>
        </div>
      </div>
    </div>`;

  document.getElementById('crm-topbar').innerHTML = `
    <div class="flex items-center gap-2.5 min-w-0">
      <button type="button" class="ds-icon-btn lg:hidden" onclick="toggleMobileNav()" aria-label="Abrir menú">${icon('menu', 'w-4 h-4')}</button>
      <span class="relative hidden sm:grid place-items-center" style="width:8px;height:8px;">
        <span class="absolute rounded-full animate-ping" style="width:8px;height:8px;background:rgb(43 212 189 / 0.6);"></span>
        <span class="rounded-full" style="width:6px;height:6px;background:var(--primary);"></span>
      </span>
      <span class="eyebrow truncate" style="color:var(--muted-foreground);" id="topbar-title">Panel comercial · ${_shellQuarterLabel()}</span>
    </div>
    <div class="flex items-center gap-2">
      <button type="button" class="btn-ghost btn-lg" onclick="openGlobalSearch()" title="Buscar (Ctrl+K)">${icon('search', 'w-4 h-4')}<span class="hidden sm:inline">Buscar</span></button>
      <div class="relative">
        <button type="button" class="btn-ghost btn-lg relative" onclick="toggleNotifications()" aria-label="Notificaciones" id="notif-btn">
          ${icon('bell', 'w-4 h-4')}
          <span class="notif-dot" id="notif-dot" hidden></span>
        </button>
        <div id="notif-panel" class="ds-popover" hidden style="top:calc(100% + 8px);right:0;width:min(380px,calc(100vw - 32px));"></div>
      </div>
      <button type="button" class="btn-primary btn-lg" onclick="openDealForm('prospeccion')">${icon('plus', 'w-4 h-4')}<span class="hidden sm:inline">Nueva oportunidad</span></button>
    </div>`;

  const mobileName = document.getElementById('crm-mobile-logo');
  if (mobileName) mobileName.innerHTML = `${_shellLogo(30)}<span class="flex flex-col leading-tight"><span class="display text-base" style="color:var(--sidebar-foreground);">Dana<span style="color:var(--primary);">.</span></span><span class="eyebrow" style="color:var(--sidebar-muted);font-size:9px;">CRM Pampai</span></span>`;

  // Navegación: links nativos + delegación (re-render aunque el hash no cambie)
  document.getElementById('crm-sidebar').addEventListener('click', (e) => {
    const el = e.target.closest('a[data-view]');
    if (!el) return;
    e.preventDefault();
    navigate(el.dataset.view);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sb-user-menu') && !e.target.closest('#sb-user-btn')) toggleUserMenu(false);
    if (!e.target.closest('#notif-panel') && !e.target.closest('#notif-btn')) toggleNotifications(false);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openGlobalSearch(); }
    if (e.key === 'Escape') { toggleNotifications(false); toggleUserMenu(false); closeGlobalSearch(); }
  });

  for (const g of SHELL_GROUPS) {
    let open = false;
    try { open = localStorage.getItem('crm_nav_' + g.id) === '1'; } catch (_) {}
    setNavGroupOpen(g.id, open, false);
  }
}

function setNavGroupOpen(id, open, persist) {
  const group = document.getElementById('nav-group-' + id);
  if (!group) return;
  group.classList.toggle('open', open);
  group.querySelector('.sb-group-toggle')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (persist) { try { localStorage.setItem('crm_nav_' + id, open ? '1' : '0'); } catch (_) {} }
}

function toggleNavGroup(id) {
  const group = document.getElementById('nav-group-' + id);
  if (group) setNavGroupOpen(id, !group.classList.contains('open'), true);
}

function toggleMobileNav(force) {
  const open = typeof force === 'boolean' ? force : !document.body.classList.contains('nav-open');
  document.body.classList.toggle('nav-open', open);
}

function toggleUserMenu(force) {
  const menu = document.getElementById('sb-user-menu');
  if (!menu) return;
  const open = typeof force === 'boolean' ? force : menu.hidden;
  menu.hidden = !open;
  document.getElementById('sb-user-btn')?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/** Marca activo el item del sidebar y actualiza el título de la barra superior */
function shellSetActive(view) {
  const items = [...document.querySelectorAll('#crm-sidebar [data-view]')];
  let match = items.find((el) => el.dataset.view === view)
    || items.find((el) => (el.dataset.aliases || '').split(',').includes(view))
    || items.find((el) => el.dataset.view === view.split('/')[0])
    || items.find((el) => (el.dataset.aliases || '').split(',').includes(view.split('/')[0]));
  items.forEach((el) => el.classList.toggle('active', el === match));
  const group = match?.closest('.sb-group');
  if (group && !group.classList.contains('open')) setNavGroupOpen(group.id.replace('nav-group-', ''), true, false);

  const base = view.split('/')[0];
  let title = SHELL_TITLES[base] || 'Dana';
  if (base === 'agent') title = `Agentes IA · ${agentInfo[view.split('/')[1]]?.name || ''}`;
  if (base === 'leads' && view.includes('/')) title = `Leads · ${(sourceLabel[view.split('/')[1]] || view.split('/')[1]).replace(/^\S+\s/, '')}`;
  const t = document.getElementById('topbar-title');
  if (t) t.textContent = `${title} · ${_shellQuarterLabel()}`;
}

// ─── Datos del shell: objetivo, badges, notificaciones ───────────────────────
let _shellDash = null;

/** Lo llama el Panel con su respuesta de /api/crm/dashboard (o el boot si se entra por otra vista) */
function shellUpdateFromDashboard(res) {
  if (!res?.ok) return;
  _shellDash = res;
  const q = res.quarter;
  const el = document.getElementById('sb-quarter');
  if (el && q) {
    const has = q.target_amount != null;
    const p = has ? Math.max(0, Math.min(100, q.progress_pct || 0)) : 0;
    const msg = !has ? 'Definí un objetivo para seguir el avance.'
      : p >= 100 ? '¡objetivo cumplido!' : p >= 66 ? 'vas por buen camino.' : p >= 33 ? 'a mitad de camino.' : 'hay que acelerar.';
    el.innerHTML = `
      <div class="flex items-center justify-between"><span class="eyebrow" style="color:var(--sidebar-muted);">Objetivo ${_escHtml(q.label.split(' ')[0])}</span>
        <span class="font-data text-xs" style="color:var(--primary);">${has ? `${p}%` : 'Definir'}</span></div>
      <div class="h-1.5 overflow-hidden rounded-full" style="background:#22222e;"><div class="h-full rounded-full sb-quarter-bar" style="width:${p}%;background:linear-gradient(90deg,var(--primary),var(--accent));"></div></div>
      <p class="text-xs leading-relaxed text-left" style="color:var(--sidebar-muted);">${has
        ? `${fmtCompact(q.achieved, q.currency)} de ${fmtCompact(q.target_amount, q.currency)} — ${msg}`
        : `Cerrado en el trimestre: ${fmtCompact(q.achieved, q.currency)}. ${msg}`}</p>`;
  }
  const open = (res.board || []).filter((d) => d.status === 'open').length;
  const b = document.getElementById('nb-pipeline');
  if (b) { b.hidden = !open; b.textContent = open; }
}

async function shellLoadDashboardData() {
  shellUpdateFromDashboard(await api('/api/crm/dashboard'));
}

async function refreshNavBadges() {
  const res = await api('/api/agent-decisions?status=pending&limit=100');
  const n = res?.decisions?.length || 0;
  const b = document.getElementById('nb-bandeja');
  if (b) { b.hidden = !n; b.textContent = n; b.title = `${n} aprobaciones de agentes pendientes`; }
  const dot = document.getElementById('notif-dot');
  if (dot) dot.hidden = !n && !window._notifOverdue;
}

async function toggleNotifications(force) {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const open = typeof force === 'boolean' ? force : panel.hidden;
  panel.hidden = !open;
  if (!open) return;
  panel.innerHTML = `<div class="p-4 space-y-2"><div class="skeleton h-10"></div><div class="skeleton h-10"></div><div class="skeleton h-10"></div></div>`;
  const res = await api('/api/crm/agenda');
  const items = res?.items || [];
  const now = Date.now();
  const soon = now + 2 * 86400000;
  const followups = items.filter((i) => i.kind === 'followup');
  const rows = items
    .filter((i) => i.kind !== 'followup')
    .filter((i) => i.kind === 'approval' || i.kind === 'briefing' || (i.due_at && new Date(i.due_at).getTime() <= soon))
    .sort((a, b) => new Date(a.due_at || a.created_at || 0) - new Date(b.due_at || b.created_at || 0))
    .slice(0, 8);
  window._notifOverdue = items.some((i) => i.overdue && i.kind !== 'followup');
  const kindIcon = { approval: 'bot', briefing: 'fileText', meeting: 'calendar', task: 'checkCircle', deal_close: 'zap' };
  panel.innerHTML = `
    <div class="flex items-center justify-between px-4 pt-3.5 pb-2">
      <p class="eyebrow">Notificaciones</p>
      <a href="#tasks" class="text-xs" style="color:var(--primary);" onclick="toggleNotifications(false)">Ver todo</a>
    </div>
    <div class="max-h-[60vh] overflow-y-auto nice-scroll px-1.5 pb-1.5">
      ${rows.length || followups.length ? '' : `<p class="px-3 py-6 text-center text-sm" style="color:var(--muted-foreground);">Nada pendiente por ahora.</p>`}
      ${rows.map((i) => `
        <a href="${i.href || '#tasks'}" class="ds-menu-item items-start" onclick="toggleNotifications(false)">
          <span class="grid place-items-center rounded-full shrink-0 mt-0.5" style="width:28px;height:28px;background:${i.overdue ? 'var(--danger-soft)' : 'var(--primary-soft)'};color:${i.overdue ? 'var(--danger)' : 'var(--primary)'};">${icon(kindIcon[i.kind] || 'bell', 'w-3.5 h-3.5')}</span>
          <span class="flex flex-col min-w-0">
            <span class="text-sm font-medium truncate" style="color:var(--foreground);">${_escHtml(i.title)}</span>
            <span class="text-xs truncate" style="color:${i.overdue ? 'var(--danger)' : 'var(--muted-foreground)'};">${i.due_at ? `${i.overdue ? 'Venció' : 'Vence'} ${fmtRelative(i.due_at)}` : _escHtml(i.subtitle || 'Pendiente de aprobación')}</span>
          </span>
        </a>`).join('')}
      ${followups.length ? `
        <a href="#tasks" class="ds-menu-item" onclick="toggleNotifications(false)">
          <span class="grid place-items-center rounded-full shrink-0" style="width:28px;height:28px;background:var(--warning-soft);color:var(--warning);">${icon('clock', 'w-3.5 h-3.5')}</span>
          <span class="text-sm" style="color:var(--foreground);">${followups.length} ${followups.length === 1 ? 'seguimiento vencido' : 'seguimientos vencidos'} de leads</span>
        </a>` : ''}
    </div>`;
  refreshNavBadges();
}

/** Pestañas de Bandeja: correo (Gmail) y aprobaciones de agentes */
function bandejaTabs(active) {
  const n = Number(document.getElementById('nb-bandeja')?.textContent) || 0;
  const tab = (view, label, extra = '') => `<a href="#${view}" class="${active === view ? 'btn-primary' : 'btn-ghost'}" style="text-decoration:none;">${label}${extra}</a>`;
  return `<div class="flex flex-wrap gap-2 mt-3 no-print">
    ${tab('mail', `${icon('mail', 'w-4 h-4')} Correo · Gmail`)}
    ${tab('inbox', `${icon('bot', 'w-4 h-4')} Aprobaciones IA`, n ? ` <span class="sb-badge" style="${active === 'inbox' ? 'background:rgb(4 20 15 / 0.2);color:#04140f;' : ''}">${n}</span>` : '')}
  </div>`;
}

// ─── Buscador global (Ctrl+K) ────────────────────────────────────────────────
function openGlobalSearch() {
  let el = document.getElementById('global-search');
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="global-search" class="gs-wrap" hidden onclick="if(event.target===this)closeGlobalSearch()">
        <div class="gs-panel" role="dialog" aria-modal="true" aria-label="Buscar en el CRM">
          <label class="ds-search" style="border-radius:16px 16px 0 0;border-width:0 0 1px 0;padding-top:14px;padding-bottom:14px;">
            ${icon('search', 'w-4 h-4')}
            <input id="gs-input" placeholder="Buscar leads, contactos, empresas, oportunidades…" autocomplete="off"
              oninput="clearTimeout(window._gsT);window._gsT=setTimeout(_runGlobalSearch,220)"
              onkeydown="if(event.key==='Enter'){document.querySelector('#gs-results .gs-item')?.click()}">
            <kbd class="font-data text-[10px] px-1.5 py-0.5 rounded" style="border:1px solid var(--border);color:var(--muted-foreground);">ESC</kbd>
          </label>
          <div id="gs-results" class="max-h-[60vh] overflow-y-auto nice-scroll p-2">
            <p class="px-3 py-6 text-center text-sm" style="color:var(--muted-foreground);">Escribí al menos 2 letras.</p>
          </div>
        </div>
      </div>`);
    el = document.getElementById('global-search');
  }
  el.hidden = false;
  setTimeout(() => document.getElementById('gs-input')?.focus(), 20);
}

function closeGlobalSearch() {
  const el = document.getElementById('global-search');
  if (el) el.hidden = true;
}

async function _runGlobalSearch() {
  const q = (document.getElementById('gs-input')?.value || '').trim();
  const box = document.getElementById('gs-results');
  if (!box) return;
  if (q.length < 2) {
    box.innerHTML = `<p class="px-3 py-6 text-center text-sm" style="color:var(--muted-foreground);">Escribí al menos 2 letras.</p>`;
    return;
  }
  box.innerHTML = `<div class="space-y-2 p-2"><div class="skeleton h-9"></div><div class="skeleton h-9"></div></div>`;
  const enc = encodeURIComponent(q);
  const [leads, contacts, companies, deals] = await Promise.all([
    api(`/api/leads?q=${enc}&limit=6`),
    api(`/api/contacts?q=${enc}&limit=6`),
    api(`/api/companies?q=${enc}&limit=6`),
    api(`/api/deals?q=${enc}&limit=6`),
  ]);
  if ((document.getElementById('gs-input')?.value || '').trim() !== q) return;
  window._gsLeads = Object.fromEntries((leads?.leads || []).map((l) => [l.id, l]));
  const group = (title, rows) => rows.length ? `<p class="eyebrow px-3 pt-3 pb-1" style="color:var(--muted-foreground);">${title}</p>${rows.join('')}` : '';
  const item = (ic, label, sub, onclick) => `<button type="button" class="gs-item ds-menu-item" onclick="closeGlobalSearch();${onclick}">
      <span class="grid place-items-center rounded-full shrink-0" style="width:28px;height:28px;background:var(--secondary);color:var(--muted-foreground);">${icon(ic, 'w-3.5 h-3.5')}</span>
      <span class="flex flex-col min-w-0 text-left"><span class="text-sm font-medium truncate" style="color:var(--foreground);">${_escHtml(label)}</span>${sub ? `<span class="text-xs truncate" style="color:var(--muted-foreground);">${_escHtml(sub)}</span>` : ''}</span>
    </button>`;
  const html = [
    group('Oportunidades', (deals?.deals || []).map((d) => item('zap', d.title, [d.companies?.name, fmtMoney(d.value, d.currency)].filter(Boolean).join(' · '), `openDealDrawer('${d.id}')`))),
    group('Contactos', (contacts?.contacts || []).map((c) => item('users', c.name || c.email, [c.companies?.name, c.email].filter(Boolean).join(' · '), c.lead_id ? `navigate('contacts/${c.lead_id}')` : `navigate('contacts')`))),
    group('Empresas', (companies?.companies || []).map((c) => item('building', c.name, [c.industry, c.city].filter(Boolean).join(' · '), `navigate('companies');setTimeout(()=>typeof openCompanyDetail==='function'&&openCompanyDetail('${c.id}'),400)`))),
    group('Leads', (leads?.leads || []).map((l) => item('userPlus', l.name || l.email || 'Sin nombre', [statusLabel[l.status], (sourceLabel[l.source] || l.source || '').replace(/^\S+\s/, '')].filter(Boolean).join(' · '),
      l.status === 'won' ? `navigate('contacts/${l.id}')` : `openLeadModal(window._gsLeads['${l.id}'])`))),
  ].join('');
  box.innerHTML = html || `<div class="flex flex-col items-center gap-2 px-3 py-8 text-center" style="color:var(--muted-foreground);">${icon('searchX', 'w-5 h-5')}<p class="text-sm">Sin coincidencias para “${_escHtml(q)}”.</p></div>`;
}
