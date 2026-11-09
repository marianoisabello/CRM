// Panel — pantalla inicial del diseño nuevo (crm-dashboard-new-design) con datos reales.
// Fuentes: GET /api/crm/dashboard (KPIs, objetivo, tablero, contactos en juego) + GET /api/leads/stats (captación y agentes).

function _greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function _firstName() {
  try {
    const u = JSON.parse(localStorage.getItem('crm_user') || '{}');
    const n = (u.name || u.email || '').trim();
    return n.includes('@') ? n.split('@')[0] : n.split(' ')[0];
  } catch (_) {
    return '';
  }
}

function _dashHeadline(h) {
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  if (h.negotiating) return `${n(h.negotiating, 'oportunidad está caliente', 'oportunidades están calientes')} hoy`;
  if (h.hot_leads) return `${n(h.hot_leads, 'lead caliente espera', 'leads calientes esperan')} respuesta`;
  if (h.pending_decisions) return `${n(h.pending_decisions, 'decisión de agente espera', 'decisiones de agentes esperan')} tu aprobación`;
  return 'Todo en orden por ahora';
}

let _dashCache = null;
let _dashContacts = { q: '', stage: 'all', menu: false };

async function renderDashboard(root) {
  const [res, statsRes] = await Promise.all([api('/api/crm/dashboard'), api('/api/leads/stats')]);
  if (!res?.ok) {
    root.innerHTML = `<div class="view-pad">${emptyState({
      headline: 'Error cargando el panel',
      body: res?.error || 'No se pudieron obtener los datos.',
      actionLabel: 'Reintentar',
      actionOnclick: "renderDashboard(document.getElementById('view-root'))",
    })}</div>`;
    return;
  }
  _dashCache = { res, stats: statsRes?.stats || null };
  shellUpdateFromDashboard(res);
  const { kpis, headline: h } = res;
  const name = _firstName();

  const sub = [
    h.negotiating && h.hot_leads ? `Además, ${h.hot_leads} ${h.hot_leads === 1 ? 'lead caliente espera' : 'leads calientes esperan'} respuesta.` : null,
    h.pending_decisions ? `${h.pending_decisions} ${h.pending_decisions === 1 ? 'aprobación pendiente' : 'aprobaciones pendientes'} de los agentes.` : null,
    h.next_meetings?.length ? `Próxima reunión ${fmtRelative(h.next_meetings[0].scheduled_at)}.` : null,
  ].filter(Boolean).join(' ');

  const heroAction = h.top_deal
    ? `<button type="button" class="btn-primary btn-lg" onclick="openDealDrawer('${h.top_deal.id}')">Revisar ${_escHtml(h.top_deal.company || h.top_deal.title)} ${icon('arrowRight', 'w-4 h-4')}</button>`
    : h.hot_leads
      ? `<button type="button" class="btn-primary btn-lg" onclick="navigate('pipeline')">Ver leads calientes ${icon('arrowRight', 'w-4 h-4')}</button>`
      : `<button type="button" class="btn-primary btn-lg" onclick="openDealForm('prospeccion')">${icon('plus', 'w-4 h-4')} Nueva oportunidad</button>`;

  const cr = kpis.close_rate;
  const closedAmount = kpis.closed_month.basis === 'deals' && kpis.closed_month.amount ? fmtCompact(kpis.closed_month.amount) : null;
  const board = res.board || [];
  const top = h.top_deal ? board.find((d) => d.id === h.top_deal.id) : null;

  root.innerHTML = `
    <section class="aura grid-bg relative overflow-hidden px-5 py-12 md:px-8 md:py-16" style="border-bottom:1px solid var(--border);">
      <div class="relative flex max-w-3xl flex-col gap-4 anim-fade-up">
        <p class="eyebrow">${_greeting()}${name ? `, ${_escHtml(name)}` : ''}</p>
        <h1 class="display text-4xl md:text-6xl" style="color:var(--foreground);text-wrap:balance;">${_escHtml(_dashHeadline(h))}</h1>
        <p class="max-w-xl leading-relaxed" style="color:var(--muted-foreground);text-wrap:pretty;">${sub ? `${_escHtml(sub)} ` : ''}Tu pipeline se actualiza en vivo: arrastrá, editá y registrá actividad sin salir de esta pantalla.</p>
        <div class="mt-2 flex flex-wrap items-center gap-3 no-print">
          ${heroAction}
          <button type="button" class="btn-ghost btn-lg" onclick="window._reportsPreset='quarter';navigate('reports')">${icon('calendar', 'w-4 h-4')} Este trimestre</button>
        </div>
      </div>
    </section>

    <div class="flex flex-col gap-14 px-5 py-12 md:px-8">
      <div class="ds-kpi-row">
        ${kpiCardHtml({
          label: 'Pipeline total', icon: 'trendingUp', color: 'var(--primary)', bg: 'var(--primary-soft)', onclick: "navigate('deals')",
          valueHtml: countUpMoneyHtml(kpis.pipeline_total.value, kpis.pipeline_total.currency),
          footHtml: kpis.pipeline_total.open_count
            ? deltaBadge(kpis.pipeline_total.new_this_month, kpis.pipeline_total.new_prev_month, { label: 'altas vs mes anterior' })
            : badgeHtml('sin oportunidades abiertas', 'neutral', 'sm'),
        })}
        ${kpiCardHtml({
          label: 'Cerradas este mes', icon: 'circleCheck', color: '#a78bfa', bg: 'var(--accent-soft)',
          valueHtml: countUpHtml(kpis.closed_month.value),
          footHtml: deltaBadge(kpis.closed_month.value, kpis.closed_month.prev, { mode: 'abs' }) + (closedAmount ? ` <span class="text-xs ml-1" style="color:var(--muted-foreground);">${closedAmount}</span>` : ''),
        })}
        ${kpiCardHtml({
          label: 'Actividades hoy', icon: 'bolt', color: 'var(--info)', bg: 'var(--info-soft)', onclick: "navigate('activities')",
          valueHtml: countUpHtml(kpis.activities_today.value),
          footHtml: deltaBadge(kpis.activities_today.value, kpis.activities_today.prev, { label: 'vs ayer' }),
        })}
        ${kpiCardHtml({
          label: 'Tasa de cierre', icon: 'target', color: 'var(--warning)', bg: 'var(--warning-soft)', onclick: "navigate('reports')",
          valueHtml: cr.value == null ? '—' : `<span data-count-up="${cr.value}" data-count-suffix="%">0%</span>`,
          footHtml: cr.value == null ? badgeHtml('sin cierres este mes', 'neutral', 'sm') : deltaBadge(cr.value, cr.prev, { mode: 'pts' }),
        })}
      </div>

      ${sectionHtml({
        eyebrow: 'Pipeline',
        title: 'Todo el trimestre en un tablero',
        subtitle: 'Arrastrá una tarjeta entre etapas. Soltala en Ganado y celebramos con vos.',
        action: `<a href="#deals" class="btn-ghost no-print" style="text-decoration:none;">Abrir Pipeline ${icon('arrowRight', 'w-4 h-4')}</a>`,
        body: '<div id="dash-kanban" class="-mx-1 px-1"></div>',
      })}

      ${sectionHtml({
        eyebrow: 'Contactos',
        title: 'Quién está en juego ahora mismo',
        subtitle: 'Filtrá por etapa o buscá por nombre; tocá una fila para abrir la oportunidad.',
        action: `<a href="#contacts" class="btn-ghost no-print" style="text-decoration:none;">Todos los contactos ${icon('arrowRight', 'w-4 h-4')}</a>`,
        body: '<div id="dash-contacts" class="flex flex-col gap-4"></div>',
      })}

      ${top ? sectionHtml({
        eyebrow: 'Detalle',
        title: 'Una ficha para cada oportunidad',
        subtitle: 'Edición en línea, línea de tiempo de actividad y cierre en un toque.',
        body: `<div class="gradient-ring flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6" style="border:1px solid var(--border);background:var(--card);">
          <div class="flex items-center gap-4 min-w-0">
            <span class="grid place-items-center rounded-full shrink-0" style="width:44px;height:44px;background:var(--primary-soft);color:var(--primary);">${icon('sparkles', 'w-5 h-5')}</span>
            <div class="flex flex-col gap-0.5 min-w-0">
              <p class="text-sm font-semibold" style="color:var(--foreground);">${_escHtml(top.companies?.name || top.title)} · ${fmtMoney(top.value, top.currency)}</p>
              <p class="text-sm" style="color:var(--muted-foreground);">${_escHtml(top.title)}, en ${_escHtml((dealStageLabel[top.stage] || top.stage).toLowerCase())}${top.days_in_stage != null ? ` desde hace ${top.days_in_stage} ${top.days_in_stage === 1 ? 'día' : 'días'}` : ''}.</p>
            </div>
          </div>
          <button type="button" class="btn-primary btn-lg" onclick="openDealDrawer('${top.id}')">Abrir ficha ${icon('arrowRight', 'w-4 h-4')}</button>
        </div>`,
      }) : ''}

      <div id="dash-captacion"></div>
    </div>`;

  const boardEl = document.getElementById('dash-kanban');
  const visible = board.filter((d) => d.stage !== 'perdido');
  if (!board.length) {
    boardEl.innerHTML = emptyState({
      headline: 'Todavía no hay oportunidades',
      body: 'Se crean solas cuando un lead pasa a Calificado o Ganado, o podés cargar una a mano.',
      actionLabel: 'Nueva oportunidad',
      actionOnclick: "openDealForm('prospeccion')",
      iconHtml: icon('sprout', 'w-5 h-5'),
    });
    _kanbanState = { stages: res.stages, deals: [], onChange: refreshDashboard };
  } else {
    renderDealKanban(boardEl, { stages: res.stages, deals: visible, compact: true, hideLost: true, onChange: refreshDashboard });
  }

  _renderDashContacts();
  document.getElementById('dash-captacion').innerHTML = _dashCaptacion(_dashCache.stats);
}

async function refreshDashboard() {
  const root = document.getElementById('view-root');
  if (!root || (window.location.hash || '#dashboard') !== '#dashboard') return;
  await renderDashboard(root);
  hydrateMotion(root);
}

// ─── Contactos en juego (tabla del diseño, sobre las oportunidades reales) ─────
const _dashStageTone = { prospeccion: 'info', propuesta: 'teal', negociacion: 'warning', ganado: 'violet', perdido: 'neutral' };

function _renderDashContacts() {
  const el = document.getElementById('dash-contacts');
  if (!el || !_dashCache) return;
  const stages = _dealStageCols(_dashCache.res.stages).filter((s) => s.key !== 'perdido');
  const all = (_dashCache.res.board || []).filter((d) => d.stage !== 'perdido');
  const q = _dashContacts.q.trim().toLowerCase();
  const rows = all.filter((d) => {
    const okStage = _dashContacts.stage === 'all' || d.stage === _dashContacts.stage;
    const hay = `${d.contacts?.name || ''} ${d.companies?.name || ''} ${d.owner?.name || ''} ${d.title || ''}`.toLowerCase();
    return okStage && (!q || hay.includes(q));
  });
  const stageName = _dashContacts.stage === 'all' ? 'Todas' : (stages.find((s) => s.key === _dashContacts.stage)?.label || _dashContacts.stage);

  el.innerHTML = `
    <div class="flex flex-wrap items-center gap-2">
      <label class="ds-search flex-1" style="min-width:240px;">
        ${icon('search', 'w-4 h-4')}
        <span class="sr-only">Buscar contactos</span>
        <input id="dash-contacts-q" value="${_escHtml(_dashContacts.q)}" placeholder="Buscar personas, empresas, responsables…"
          oninput="_dashContacts.q=this.value;clearTimeout(window._dcT);window._dcT=setTimeout(()=>{_renderDashContacts();const i=document.getElementById('dash-contacts-q');i.focus();i.setSelectionRange(i.value.length,i.value.length);},150)">
      </label>
      <div class="relative">
        <button type="button" class="btn-ghost btn-lg" style="background:var(--card);" aria-expanded="${_dashContacts.menu}" onclick="_dashContacts.menu=!_dashContacts.menu;_renderDashContacts()">
          Etapa: ${_escHtml(stageName)} <span style="display:inline-flex;transition:transform .2s;${_dashContacts.menu ? 'transform:rotate(180deg);' : ''}">${icon('chevronDown', 'w-4 h-4')}</span>
        </button>
        ${_dashContacts.menu ? `<div class="ds-popover" style="top:calc(100% + 8px);right:0;width:208px;">
          ${[{ key: 'all', label: 'Todas' }, ...stages].map((s) => `<button type="button" class="ds-menu-item" style="${_dashContacts.stage === s.key ? 'background:var(--primary-soft);color:var(--primary);font-weight:600;' : ''}"
            onclick="_dashContacts.stage='${s.key}';_dashContacts.menu=false;_renderDashContacts()">${_escHtml(s.label)}</button>`).join('')}
        </div>` : ''}
      </div>
    </div>
    <div class="ds-table-wrap nice-scroll" style="max-height:440px;">
      <table class="ds-table">
        <thead><tr>${['Contacto', 'Empresa', 'Etapa', 'Importe', 'Última actividad', 'Responsable'].map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map((d) => `
            <tr onclick="openDealDrawer('${d.id}')">
              <td class="relative">
                <span class="row-accent" aria-hidden="true"></span>
                <span class="flex items-center gap-3">
                  ${avatarHtml(d.contacts?.name || d.title || '?', { size: 32 })}
                  <span class="flex flex-col leading-tight min-w-0">
                    <span class="text-sm font-semibold" style="color:var(--foreground);">${_escHtml(d.contacts?.name || 'Sin contacto')}</span>
                    <span class="text-xs truncate" style="color:var(--muted-foreground);">${_escHtml(d.contacts?.role || d.title || '')}</span>
                  </span>
                </span>
              </td>
              <td class="text-sm font-medium whitespace-nowrap" style="color:var(--foreground);">${_escHtml(d.companies?.name || '—')}</td>
              <td>${badgeHtml(_escHtml(stages.find((s) => s.key === d.stage)?.label || dealStageLabel[d.stage] || d.stage), _dashStageTone[d.stage] || 'neutral', 'sm')}</td>
              <td class="tnum font-data text-sm whitespace-nowrap" style="color:var(--primary);">${fmtMoney(d.value, d.currency)}</td>
              <td class="text-sm whitespace-nowrap" style="color:var(--muted-foreground);">${d.last_activity_at ? fmtRelative(d.last_activity_at) : fmtRelative(d.updated_at)}</td>
              <td>${d.owner?.name ? `<span class="flex items-center gap-2 whitespace-nowrap">${avatarHtml(d.owner.name, { size: 24 })}<span class="text-sm font-medium" style="color:var(--foreground);">${_escHtml(d.owner.name)}</span></span>` : '<span class="text-sm" style="color:var(--muted-foreground);">Sin asignar</span>'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      ${rows.length ? '' : emptyState({
        headline: all.length ? 'Sin coincidencias' : 'Nadie en juego todavía',
        body: all.length ? 'Probá con otro nombre o quitá el filtro de etapa: tu próximo cierre puede estar a una búsqueda.' : 'Cuando haya oportunidades abiertas, sus contactos aparecen acá.',
        actionLabel: all.length ? 'Limpiar filtros' : 'Nueva oportunidad',
        actionOnclick: all.length ? "_dashContacts.q='';_dashContacts.stage='all';_renderDashContacts()" : "openDealForm('prospeccion')",
        iconHtml: icon('searchX', 'w-5 h-5'),
        className: 'border-0',
      })}
    </div>`;
}

// ─── Captación: el CRM real (leads y agentes) en el lenguaje del diseño ────────
function _dashCaptacion(stats) {
  if (!stats) return '';
  const c = stats.by_classification || {};
  const srcColors = {
    web_form: 'var(--info)', manychat: 'var(--success)', instagram: '#ec4899', chatbot: 'var(--accent)',
    whatsapp: 'var(--primary)', linkedin: 'var(--info)', email: 'var(--warning)', database_import: 'var(--muted-foreground)',
  };
  const srcName = (s) => (sourceLabel[s] || (s === 'chatbot' ? 'Chatbox' : s)).replace(/^\S+\s/, (m) => (/[a-z]/i.test(m) ? m : ''));
  const sourceRows = Object.entries(stats.by_source || {})
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => {
      const pctv = stats.total ? Math.round((count / stats.total) * 100) : 0;
      return `<a href="#leads/${_escHtml(src)}" class="flex items-center gap-3 py-1.5 rounded-lg" style="text-decoration:none;">
        <span class="text-sm w-32 shrink-0 truncate" style="color:var(--muted-foreground);">${_escHtml(srcName(src))}</span>
        <div class="flex-1">${progressBar(pctv, srcColors[src] || 'var(--primary)', 6)}</div>
        <span class="font-data text-xs w-7 text-right tnum" style="color:var(--foreground);">${count}</span>
      </a>`;
    }).join('');

  const a = stats.agents || {};
  const agentItems = [
    { label: 'Perfiles', val: a.perfiles || 0, href: '#agent/analyst' },
    { label: 'Reuniones', val: a.reuniones || 0, href: '#agent/reuniones' },
    { label: 'Briefings', val: a.briefings || 0, href: '#agent/briefing' },
    { label: 'Performance', val: a.performance_reports || 0, href: '#agent/performance' },
    { label: 'Reporting', val: a.monthly_reports || 0, href: '#agent/reporting' },
    { label: 'Clientes activos', val: a.clients_active || 0, href: '#agent/reporting' },
  ];

  const recentRows = (stats.recent_leads || []).map((l) => `
    <button type="button" class="ds-menu-item justify-between" onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, '&#39;')})'>
      <span class="flex items-center gap-2.5 min-w-0">
        ${avatarHtml(l.name || '?', { size: 28 })}
        <span class="flex flex-col min-w-0 text-left">
          <span class="text-sm font-medium truncate" style="color:var(--foreground);">${_escHtml(l.name || 'Sin nombre')}</span>
          <span class="text-xs font-data" style="color:var(--muted-foreground);">${fmtRelative(l.created_at)}</span>
        </span>
      </span>
      ${classificationBadge(l.classification)}
    </button>`).join('');

  return sectionHtml({
    eyebrow: 'Captación',
    title: 'Leads y agentes trabajando para vos',
    subtitle: 'Lo que entra por cada canal y lo que los agentes IA ya procesaron.',
    action: `<a href="#leads" class="btn-ghost no-print" style="text-decoration:none;">Ver leads ${icon('arrowRight', 'w-4 h-4')}</a>`,
    body: `
      <div class="ds-kpi-row">
        ${kpiCardHtml({ label: 'Leads totales', icon: 'userPlus', color: 'var(--info)', bg: 'var(--info-soft)', onclick: "navigate('leads')", valueHtml: countUpHtml(stats.total || 0), footHtml: badgeHtml(`score promedio ${stats.avg_score || 0}`, 'neutral', 'sm') })}
        ${kpiCardHtml({ label: 'Calientes', icon: 'zap', color: 'var(--danger)', bg: 'var(--danger-soft)', onclick: "navigate('pipeline')", valueHtml: countUpHtml(c.hot || 0), footHtml: badgeHtml('agendar reunión', 'danger', 'sm') })}
        ${kpiCardHtml({ label: 'Tibios', icon: 'sparkles', color: 'var(--warning)', bg: 'var(--warning-soft)', onclick: "navigate('pipeline')", valueHtml: countUpHtml(c.warm || 0), footHtml: badgeHtml('enviar info', 'warning', 'sm') })}
        ${kpiCardHtml({ label: 'Fríos', icon: 'target', color: 'var(--info)', bg: 'var(--info-soft)', onclick: "navigate('pipeline')", valueHtml: countUpHtml(c.cold || 0), footHtml: badgeHtml('nutrir', 'info', 'sm') })}
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="card flex flex-col gap-3">
          <div class="flex items-center justify-between"><p class="eyebrow">Por canal</p><span class="font-data text-xs" style="color:var(--muted-foreground);">${stats.total || 0} total</span></div>
          <div>${sourceRows || '<p class="text-sm py-4 text-center" style="color:var(--muted-foreground);">Sin datos</p>'}</div>
        </div>
        <div class="card flex flex-col gap-3">
          <p class="eyebrow">Agentes IA</p>
          <div class="grid grid-cols-2 gap-2">
            ${agentItems.map((it) => `<a href="${it.href}" class="rounded-xl p-3 transition" style="text-decoration:none;border:1px solid var(--border);background:var(--elevated);"
                onmouseover="this.style.borderColor='rgb(43 212 189 / 0.4)'" onmouseout="this.style.borderColor='var(--border)'">
              <p class="eyebrow" style="color:var(--muted-foreground);font-size:10px;">${it.label}</p>
              <p class="display text-3xl mt-1 tnum" style="color:var(--foreground);"><span data-count-up="${it.val}">0</span></p>
            </a>`).join('')}
          </div>
        </div>
        <div class="card flex flex-col gap-2">
          <div class="flex items-center justify-between"><p class="eyebrow">Últimos leads</p><a href="#leads" class="text-xs" style="color:var(--primary);">Ver todos</a></div>
          <div class="-mx-2">${recentRows || '<p class="text-sm py-8 text-center" style="color:var(--muted-foreground);">Sin leads aún</p>'}</div>
        </div>
      </div>`,
  });
}

// ─── Objetivo del trimestre (crm_settings) ───────────────────────────────────
function openQuarterTargetForm() {
  const q = _dashCache?.res?.quarter || _shellDash?.quarter || {};
  openModalShell(`Objetivo ${q.label || 'del trimestre'}`, 'Importe a cerrar (oportunidades ganadas) en el trimestre', `
    <div class="space-y-3">
      <div class="grid grid-cols-3 gap-3">
        <div class="col-span-2"><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Importe objetivo</label>
          <input id="qt-amount" type="number" min="0" class="input" value="${q.target_amount ?? ''}" placeholder="Ej. 50000"></div>
        <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Moneda</label>
          <select id="qt-currency" class="input">${['USD', 'ARS', 'EUR'].map((c) => `<option ${c === (q.currency || 'USD') ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      </div>
      ${q.achieved != null ? `<p class="text-xs" style="color:var(--muted-foreground);">Cerrado hasta ahora: <span class="font-data" style="color:var(--foreground);">${fmtMoney(q.achieved, q.currency)}</span> en ${q.achieved_count || 0} ${q.achieved_count === 1 ? 'oportunidad' : 'oportunidades'}.</p>` : ''}
      ${q.settings_missing ? `<p class="text-xs rounded-lg px-3 py-2" style="background:var(--warning-soft);color:var(--warning);border:1px solid rgb(245 177 76 / 0.35);">Para guardar el objetivo falta crear la tabla <code>crm_settings</code> (scripts/migrations/008_crm_settings.sql).</p>` : ''}
      <div class="flex gap-2 pt-1">
        <button type="button" class="btn-primary" onclick="_saveQuarterTarget()">Guardar</button>
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
      </div>
    </div>`);
  setTimeout(() => document.getElementById('qt-amount')?.focus(), 50);
}

async function _saveQuarterTarget() {
  const amount = Number(document.getElementById('qt-amount')?.value);
  if (!Number.isFinite(amount) || amount <= 0) { showToast('Ingresá un importe mayor a 0', 'error'); return; }
  const currency = document.getElementById('qt-currency')?.value || 'USD';
  const key = (_dashCache?.res || _shellDash)?.quarter?.setting_key;
  if (!key) { showToast('No se pudo determinar el trimestre', 'error'); return; }
  const res = await api(`/api/crm/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: { value: { amount, currency } } });
  if (res?.ok) {
    closeModal();
    showToast('Objetivo guardado');
    if ((window.location.hash || '#dashboard') === '#dashboard') refreshDashboard();
    else shellLoadDashboardData();
  } else {
    showToast(res?.error || 'No se pudo guardar', 'error');
  }
}
