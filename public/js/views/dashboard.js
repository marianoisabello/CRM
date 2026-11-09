// Dashboard — pantalla inicial del diseño nuevo, con datos reales.
// Fuentes: GET /api/crm/dashboard (KPIs, objetivo, kanban de deals) + GET /api/leads/stats (canales, agentes, últimos leads).

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
  const parts = [];
  if (h.negotiating) parts.push(`${h.negotiating} ${h.negotiating === 1 ? 'oportunidad está' : 'oportunidades están'} en negociación`);
  if (h.hot_leads) parts.push(`${h.hot_leads} ${h.hot_leads === 1 ? 'lead caliente espera' : 'leads calientes esperan'} respuesta`);
  if (!parts.length && h.pending_decisions) parts.push(`${h.pending_decisions} ${h.pending_decisions === 1 ? 'decisión de agente espera' : 'decisiones de agentes esperan'} tu aprobación`);
  if (!parts.length) return 'Todo en orden por ahora';
  const s = parts.join(' y ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function _quarterWidget(q) {
  const r = 34;
  const c = 2 * Math.PI * r;
  if (q.target_amount == null) {
    return `<div class="rounded-xl border p-4 flex items-center gap-4" style="border-color:var(--border);background:rgb(16 16 24 / 0.6);">
      <div class="grid place-items-center rounded-full shrink-0" style="width:76px;height:76px;border:2px dashed var(--border);color:var(--muted-foreground);">
        <span class="font-data text-xs">${_escHtml(q.label.split(' ')[0])}</span>
      </div>
      <div class="min-w-0">
        <p class="eyebrow">Objetivo ${_escHtml(q.label)}</p>
        <p class="text-sm mt-1" style="color:var(--foreground);">Sin objetivo definido</p>
        <p class="text-xs mt-0.5" style="color:var(--muted-foreground);">Cerrado en el trimestre: <span class="font-data" style="color:var(--foreground);">${fmtMoney(q.achieved, q.currency)}</span></p>
        <button type="button" class="btn-ghost text-xs mt-2" onclick="openQuarterTargetForm()">Definir objetivo</button>
      </div>
    </div>`;
  }
  const p = Math.max(0, Math.min(100, q.progress_pct || 0));
  const off = c - (c * p) / 100;
  const msg = p >= 100 ? 'objetivo cumplido 🎉' : p >= 66 ? 'vas por buen camino' : p >= 33 ? 'a mitad de camino' : 'hay que acelerar';
  return `<div class="rounded-xl border p-4 flex items-center gap-4" style="border-color:var(--border);background:rgb(16 16 24 / 0.6);">
    <svg width="76" height="76" viewBox="0 0 80 80" class="shrink-0" style="transform:rotate(-90deg);">
      <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2bd4bd"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs>
      <circle cx="40" cy="40" r="${r}" fill="none" stroke-width="7" class="ring-track"/>
      <circle cx="40" cy="40" r="${r}" fill="none" stroke-width="7" stroke-linecap="round" class="ring-fill"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${prefersReducedMotion() ? off.toFixed(1) : c.toFixed(1)}" data-ring-offset="${off.toFixed(1)}"/>
    </svg>
    <div class="min-w-0">
      <p class="eyebrow">Objetivo ${_escHtml(q.label)} · <span data-count-up="${p}" data-count-suffix="%">0%</span></p>
      <p class="text-sm mt-1" style="color:var(--foreground);"><span class="font-data">${fmtMoney(q.achieved, q.currency)}</span> <span style="color:var(--muted-foreground);">de</span> <span class="font-data">${fmtMoney(q.target_amount, q.currency)}</span></p>
      <p class="text-xs mt-0.5" style="color:var(--muted-foreground);">${msg} · ${q.achieved_count} ${q.achieved_count === 1 ? 'cierre' : 'cierres'}</p>
      <button type="button" class="text-xs mt-1.5 underline" style="color:var(--muted-foreground);" onclick="openQuarterTargetForm()">Editar objetivo</button>
    </div>
  </div>`;
}

function _kpiCard({ label, valueHtml, deltaHtml, accent, icon, onclick }) {
  return `<div class="kpi-card ${onclick ? 'cursor-pointer' : ''}" style="border:none;border-radius:0;border-left:3px solid ${accent};" ${onclick ? `onclick="${onclick}"` : ''}>
    <div class="flex items-start justify-between mb-3">
      <p class="eyebrow" style="color:var(--muted-foreground);">${label}</p>
      <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background:var(--elevated);color:${accent};">${icon}</div>
    </div>
    <p class="font-data text-2xl md:text-3xl font-bold tnum" style="color:var(--foreground);">${valueHtml}</p>
    <p class="mt-1.5">${deltaHtml}</p>
  </div>`;
}

const _dashIcons = {
  pipe: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  check: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  bolt: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
  target: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
};

let _dashCache = null;

async function renderDashboard(root) {
  const [res, statsRes] = await Promise.all([api('/api/crm/dashboard'), api('/api/leads/stats')]);
  if (!res?.ok) {
    root.innerHTML = emptyState({
      headline: 'Error cargando dashboard',
      body: res?.error || 'No se pudieron obtener los datos.',
      actionLabel: 'Reintentar',
      actionOnclick: "renderDashboard(document.getElementById('view-root'))",
    });
    return;
  }
  _dashCache = { res, stats: statsRes?.stats || null };
  const { kpis, quarter, headline: h } = res;
  const name = _firstName();
  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  const heroAction = h.top_deal
    ? `<button type="button" class="btn-primary" onclick="openDealDrawer('${h.top_deal.id}')">Revisar ${_escHtml(h.top_deal.company || h.top_deal.title)}</button>`
    : h.hot_leads
      ? `<button type="button" class="btn-primary" onclick="navigate('pipeline')">Ver leads calientes</button>`
      : h.pending_decisions
        ? `<button type="button" class="btn-primary" onclick="navigate('inbox')">Ir a Bandeja IA</button>`
        : '';

  const sub = [
    h.pending_decisions ? `${h.pending_decisions} ${h.pending_decisions === 1 ? 'aprobación pendiente' : 'aprobaciones pendientes'} en Bandeja IA` : null,
    h.next_meetings?.length ? `próxima reunión ${fmtRelative(h.next_meetings[0].scheduled_at)}` : null,
  ].filter(Boolean).join(' · ');

  const closedLabel = kpis.closed_month.basis === 'leads' ? 'leads ganados' : (kpis.closed_month.amount ? fmtMoney(kpis.closed_month.amount) : '');
  const cr = kpis.close_rate;

  root.innerHTML = `
    <div class="space-y-5 anim-fade-up">
      <section class="aura grid-bg relative overflow-hidden rounded-xl border px-5 py-7 md:px-8 md:py-9" style="border-color:var(--border);">
        <div class="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div class="flex flex-col gap-2 min-w-0">
            ${eyebrow(`${today}`)}
            <p class="text-sm" style="color:var(--muted-foreground);">${_greeting()}${name ? `, ${_escHtml(name)}` : ''}</p>
            <h1 class="display text-3xl md:text-5xl" style="color:var(--foreground);">${_escHtml(_dashHeadline(h))}</h1>
            <p class="text-sm max-w-xl" style="color:var(--muted-foreground);">${sub ? _escHtml(sub) + '. ' : ''}Arrastrá las oportunidades entre etapas: el cambio se guarda al instante.</p>
            <div class="flex flex-wrap gap-2 mt-2 no-print">
              ${heroAction}
              <button type="button" class="btn-ghost" onclick="openDealForm('prospeccion')">+ Nueva oportunidad</button>
            </div>
          </div>
          <div id="dash-quarter">${_quarterWidget(quarter)}</div>
        </div>
      </section>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border" style="border-color:var(--border);background:var(--border);">
        ${_kpiCard({
          label: 'Pipeline total',
          valueHtml: countUpMoneyHtml(kpis.pipeline_total.value, kpis.pipeline_total.currency),
          deltaHtml: kpis.pipeline_total.open_count
            ? deltaChip(kpis.pipeline_total.new_this_month, kpis.pipeline_total.new_prev_month, { label: 'altas vs mes ant.' })
            : '<span class="text-xs" style="color:var(--muted-foreground);">sin oportunidades abiertas</span>',
          accent: 'var(--primary)', icon: _dashIcons.pipe, onclick: "navigate('deals')",
        })}
        ${_kpiCard({
          label: 'Cerradas este mes',
          valueHtml: countUpHtml(kpis.closed_month.value),
          deltaHtml: deltaChip(kpis.closed_month.value, kpis.closed_month.prev, { mode: 'abs' }) + (closedLabel ? ` <span class="text-[11px]" style="color:var(--muted-foreground);">· ${_escHtml(closedLabel)}</span>` : ''),
          accent: 'var(--success)', icon: _dashIcons.check,
        })}
        ${_kpiCard({
          label: 'Actividades hoy',
          valueHtml: countUpHtml(kpis.activities_today.value),
          deltaHtml: deltaChip(kpis.activities_today.value, kpis.activities_today.prev, { label: 'vs ayer' }),
          accent: 'var(--info)', icon: _dashIcons.bolt, onclick: "navigate('activities')",
        })}
        ${_kpiCard({
          label: 'Tasa de cierre',
          valueHtml: cr.value == null ? '<span style="color:var(--muted-foreground);">—</span>' : `<span data-count-up="${cr.value}" data-count-suffix="%">0%</span>`,
          deltaHtml: cr.value == null ? '<span class="text-xs" style="color:var(--muted-foreground);">sin cierres este mes</span>' : deltaChip(cr.value, cr.prev, { mode: 'pts' }),
          accent: 'var(--accent)', icon: _dashIcons.target, onclick: "navigate('reports')",
        })}
      </div>

      <section class="card" style="padding:18px;">
        <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 class="display text-2xl" style="color:var(--foreground);">Pipeline</h2>
            <p class="text-xs mt-0.5" style="color:var(--muted-foreground);">Oportunidades abiertas y cierres de los últimos 30 días</p>
          </div>
          <a href="#deals" class="text-xs no-print" style="color:var(--primary);">Abrir Pipeline deals →</a>
        </div>
        <div id="dash-kanban" class="flex gap-3 overflow-x-auto pb-2 nice-scroll"></div>
      </section>

      <div id="dash-secondary"></div>
    </div>`;

  const board = document.getElementById('dash-kanban');
  if (!res.board.length) {
    board.className = '';
    board.innerHTML = emptyState({
      headline: 'Todavía no hay oportunidades',
      body: 'Se crean solas cuando un lead pasa a Calificado o Ganado, o podés cargar una a mano.',
      actionLabel: '+ Nueva oportunidad',
      actionOnclick: "openDealForm('prospeccion')",
    });
    _kanbanState = { stages: res.stages, deals: [], onChange: refreshDashboard };
  } else {
    renderDealKanban(board, { stages: res.stages, deals: res.board, compact: true, onChange: refreshDashboard });
  }

  document.getElementById('dash-secondary').innerHTML = _dashSecondary(_dashCache.stats);
  _animateRing(root);
}

function _animateRing(scope) {
  const ring = scope.querySelector('.ring-fill[data-ring-offset]');
  if (!ring || prefersReducedMotion()) return;
  requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.strokeDashoffset = ring.dataset.ringOffset; }));
}

async function refreshDashboard() {
  const root = document.getElementById('view-root');
  if (!root || (window.location.hash || '#dashboard') !== '#dashboard') return;
  await renderDashboard(root);
  hydrateMotion(root);
}

// Secciones existentes del dashboard anterior (se conservan: canales, embudo de leads, agentes, últimos leads)
function _dashSecondary(stats) {
  if (!stats) return '';
  const c = stats.by_classification || {};
  const s = stats.by_status || {};
  const srcColors = {
    web_form: 'var(--info)', manychat: 'var(--success)', instagram: '#ec4899', chatbot: 'var(--accent)',
    whatsapp: 'var(--primary)', linkedin: 'var(--info)', email: 'var(--warning)', database_import: 'var(--muted-foreground)',
  };
  const sourceRows = Object.entries(stats.by_source || {})
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => {
      const pctv = stats.total ? Math.round((count / stats.total) * 100) : 0;
      return `<div class="flex items-center gap-3 py-1.5">
        <span class="text-xs w-32 shrink-0 truncate" style="color:var(--muted-foreground);">${sourceLabel[src] || (src === 'chatbot' ? '🤖 Chatbox' : _escHtml(src))}</span>
        <div class="flex-1">${progressBar(pctv, srcColors[src] || 'var(--primary)', 6)}</div>
        <span class="font-data text-xs w-6 text-right tnum" style="color:var(--foreground);">${count}</span>
        <span class="font-data text-xs w-8 text-right" style="color:var(--muted-foreground);">${pctv}%</span>
      </div>`;
    }).join('');

  const pipelineItems = [
    { label: 'Nuevos', val: s.new || 0, color: 'var(--info)' },
    { label: 'Contactados', val: s.contacted || 0, color: '#a78bfa' },
    { label: 'Calificados', val: s.qualified || 0, color: 'var(--success)' },
    { label: 'Ganados', val: s.won || 0, color: 'var(--primary)' },
    { label: 'Perdidos', val: s.lost || 0, color: 'var(--muted-foreground)' },
  ];
  const pipelineTotal = pipelineItems.reduce((a, p) => a + p.val, 0);

  const recentRows = (stats.recent_leads || []).map((l) => `
    <div class="flex items-center justify-between py-2.5 cursor-pointer -mx-5 px-5 rounded-lg transition"
         style="border-bottom:1px solid var(--border);"
         onmouseover="this.style.background='var(--elevated)'" onmouseout="this.style.background=''"
         onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, '&#39;')})'>
      <div class="flex items-center gap-2.5 min-w-0">
        ${avatarHtml(l.name || '?', { size: 28 })}
        <div class="min-w-0">
          <p class="text-sm font-medium truncate" style="color:var(--foreground);">${_escHtml(l.name || 'Sin nombre')}</p>
          <p class="text-xs mt-0.5 font-data" style="color:var(--muted-foreground);">${fmtRelative(l.created_at)}</p>
        </div>
      </div>
      <div class="flex items-center gap-2.5 shrink-0 ml-3">
        ${scoreBar(l.score)}
        ${classificationBadge(l.classification)}
      </div>
    </div>`).join('');

  const a = stats.agents || {};
  const agentItems = [
    { label: 'Perfiles', val: a.perfiles || 0, href: '#agent/analyst', color: 'var(--info)' },
    { label: 'Reuniones', val: a.reuniones || 0, href: '#agent/reuniones', color: 'var(--primary)' },
    { label: 'Briefings', val: a.briefings || 0, href: '#agent/briefing', color: 'var(--accent)' },
    { label: 'Performance', val: a.performance_reports || 0, href: '#agent/performance', color: 'var(--warning)' },
    { label: 'Reporting', val: a.monthly_reports || 0, href: '#agent/reporting', color: 'var(--success)' },
    { label: 'Clientes activos', val: a.clients_active || 0, href: '#agent/reporting', color: 'var(--muted-foreground)' },
  ];

  return `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-xl border" style="border-color:var(--border);background:var(--border);">
      ${[
        { label: 'Leads totales', val: stats.total || 0, color: 'var(--info)', sub: `score prom. ${stats.avg_score || 0}`, href: 'leads' },
        { label: 'Hot 🔥', val: c.hot || 0, color: 'var(--danger)', sub: 'agendar reunión', href: 'leads' },
        { label: 'Warm ☀️', val: c.warm || 0, color: 'var(--warning)', sub: 'enviar info', href: 'leads' },
        { label: 'Cold ❄️', val: c.cold || 0, color: 'var(--info)', sub: 'nutrir', href: 'leads' },
      ].map((k) => `
        <div class="kpi-card cursor-pointer" style="border:none;border-radius:0;border-left:3px solid ${k.color};" onclick="navigate('${k.href}')">
          <p class="eyebrow" style="color:var(--muted-foreground);">${k.label}</p>
          <p class="font-data text-2xl font-bold mt-2 tnum" style="color:var(--foreground);">${countUpHtml(k.val)}</p>
          <p class="text-xs mt-1" style="color:var(--muted-foreground);">${k.sub}</p>
        </div>`).join('')}
    </div>

    <div class="card mt-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-sm" style="color:var(--foreground);">Pipeline de agentes</h2>
        <span class="text-xs" style="color:var(--muted-foreground);">conteos CRM</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        ${agentItems.map((it) => `
          <a href="${it.href}" class="rounded-xl p-3 border transition block" style="border-color:var(--border);border-left:3px solid ${it.color};background:var(--elevated);"
             onmouseover="this.style.borderColor='rgb(43 212 189 / 0.35)'" onmouseout="this.style.borderColor='var(--border)'">
            <p class="eyebrow" style="color:var(--muted-foreground);">${it.label}</p>
            <p class="font-data text-2xl font-bold mt-1 tnum" style="color:var(--foreground);">${countUpHtml(it.val)}</p>
          </a>`).join('')}
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-4 mt-5">
      <div class="card space-y-1">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-sm" style="color:var(--foreground);">Leads por canal</h2>
          <span class="font-data text-xs" style="color:var(--muted-foreground);">${stats.total || 0} total</span>
        </div>
        <div class="space-y-0.5">${sourceRows || '<p class="text-sm py-4 text-center" style="color:var(--muted-foreground);">Sin datos</p>'}</div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-sm" style="color:var(--foreground);">Leads por estado</h2>
          <a href="#pipeline" class="font-data text-xs" style="color:var(--primary);">${pipelineTotal} leads →</a>
        </div>
        <div class="space-y-3.5">
          ${pipelineItems.map((p) => `
            <div>
              <div class="flex justify-between text-xs mb-1.5">
                <span style="color:var(--muted-foreground);">${p.label}</span>
                <span class="font-data font-medium tnum" style="color:var(--foreground);">${p.val}</span>
              </div>
              ${progressBar(pipelineTotal ? Math.round((p.val / pipelineTotal) * 100) : 0, p.color, 6)}
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="flex items-center justify-between mb-1">
          <h2 class="font-semibold text-sm" style="color:var(--foreground);">Últimos leads</h2>
          <button onclick="navigate('leads')" class="text-xs transition" style="color:var(--primary);">Ver todos →</button>
        </div>
        ${recentRows || '<p class="text-sm py-8 text-center" style="color:var(--muted-foreground);">Sin leads aún</p>'}
      </div>
    </div>`;
}

// ─── Objetivo del trimestre (crm_settings.quarter_target) ────────────────────
function openQuarterTargetForm() {
  const q = _dashCache?.res?.quarter || {};
  openModalShell(`Objetivo ${q.label || 'del trimestre'}`, 'Importe a cerrar (deals ganados) en el trimestre', `
    <div class="space-y-3">
      <div class="grid grid-cols-3 gap-3">
        <div class="col-span-2"><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Importe objetivo</label>
          <input id="qt-amount" type="number" min="0" class="input" value="${q.target_amount ?? ''}" placeholder="Ej. 50000"></div>
        <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Moneda</label>
          <select id="qt-currency" class="input">${['USD', 'ARS', 'EUR'].map((c) => `<option ${c === (q.currency || 'USD') ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      </div>
      ${q.settings_missing ? `<p class="text-xs rounded-lg px-3 py-2" style="background:var(--warning-soft);color:var(--warning);border:1px solid rgb(245 177 76 / 0.35);">Para guardar el objetivo falta crear la tabla <code>crm_settings</code> (scripts/migrations/008_crm_settings.sql).</p>` : ''}
      <div class="flex gap-2 pt-1">
        <button type="button" class="btn-primary" onclick="_saveQuarterTarget()">Guardar</button>
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
      </div>
    </div>`);
}

async function _saveQuarterTarget() {
  const amount = Number(document.getElementById('qt-amount')?.value);
  if (!Number.isFinite(amount) || amount <= 0) { showToast('Ingresá un importe mayor a 0', 'error'); return; }
  const currency = document.getElementById('qt-currency')?.value || 'USD';
  const key = _dashCache?.res?.quarter?.setting_key;
  if (!key) { showToast('No se pudo determinar el trimestre', 'error'); return; }
  const res = await api(`/api/crm/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: { value: { amount, currency } } });
  if (res?.ok) {
    closeModal();
    showToast('Objetivo guardado');
    refreshDashboard();
  } else {
    showToast(res?.error || 'No se pudo guardar', 'error');
  }
}
