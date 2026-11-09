'use strict';

// Informes: embudo por fuente, conversión, cierres, actividad por responsable, agentes,
// campañas (Agente Performance) y reportes mensuales (Agente Reporting). Filtro por período + export.
// Fuente: GET /api/crm/analytics?from=&to=

let _reportData = null;

function _isoDay(d) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

function _periodRange(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case 'month': return [new Date(y, m, 1), now];
    case 'prev_month': return [new Date(y, m - 1, 1), new Date(y, m, 0)];
    case '3m': return [new Date(y, m - 2, 1), now];
    case 'quarter': return [new Date(y, Math.floor(m / 3) * 3, 1), now];
    case 'year': return [new Date(y, 0, 1), now];
    case '12m': return [new Date(y, m - 11, 1), now];
    case '6m':
    default: return [new Date(y, m - 5, 1), now];
  }
}

async function renderReports(root) {
  root.innerHTML = `
    <div class="space-y-5 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('Herramientas')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Informes</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);" id="rp-range">…</p>
        </div>
        <div class="flex flex-wrap gap-2 no-print">
          <select id="rp-period" class="input" style="width:auto;" onchange="_onReportPeriod()">
            <option value="month">Este mes</option>
            <option value="prev_month">Mes anterior</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="quarter">Este trimestre</option>
            <option value="6m" selected>Últimos 6 meses</option>
            <option value="year">Este año</option>
            <option value="12m">Últimos 12 meses</option>
            <option value="custom">Personalizado…</option>
          </select>
          <span id="rp-custom" class="hidden flex gap-2">
            <input id="rp-from" type="date" class="input" style="width:auto;">
            <input id="rp-to" type="date" class="input" style="width:auto;">
            <button type="button" class="btn-ghost text-xs" onclick="_loadReports()">Aplicar</button>
          </span>
          <button type="button" class="btn-ghost text-xs" onclick="_exportReportCsv()">Exportar CSV</button>
          <button type="button" class="btn-ghost text-xs" onclick="window.print()">Imprimir / PDF</button>
        </div>
      </div>
      <div id="rp-body"><div class="skeleton h-96 rounded-xl"></div></div>
    </div>`;
  await _loadReports();
}

function _onReportPeriod() {
  const v = document.getElementById('rp-period').value;
  const custom = document.getElementById('rp-custom');
  if (v === 'custom') {
    custom.classList.remove('hidden');
    const [f, t] = _periodRange('6m');
    document.getElementById('rp-from').value ||= _isoDay(f);
    document.getElementById('rp-to').value ||= _isoDay(t);
    return;
  }
  custom.classList.add('hidden');
  _loadReports();
}

async function _loadReports() {
  const body = document.getElementById('rp-body');
  if (!body) return;
  const period = document.getElementById('rp-period')?.value || '6m';
  let from;
  let to;
  if (period === 'custom') {
    from = document.getElementById('rp-from').value;
    to = document.getElementById('rp-to').value;
    if (!from || !to || from > to) { showToast('Rango de fechas inválido', 'error'); return; }
  } else {
    const [f, t] = _periodRange(period);
    from = _isoDay(f);
    to = _isoDay(t);
  }
  body.innerHTML = '<div class="skeleton h-96 rounded-xl"></div>';
  const res = await api(`/api/crm/analytics?from=${from}&to=${to}`);
  if (!res?.ok) {
    body.innerHTML = emptyState({ headline: 'Error cargando informes', body: res?.error || '' });
    return;
  }
  _reportData = { ...res, from, to };
  document.getElementById('rp-range').textContent = `${fmtDay(from + 'T12:00:00')} → ${fmtDay(to + 'T12:00:00')}`;
  body.innerHTML = _reportsHtml(res);
  hydrateMotion(body);
}

function _srcName(s) {
  return sourceLabel[s] || (s === 'chatbot' ? '🤖 Chatbox' : s);
}

function _sectionCard(title, sub, inner, extra = '') {
  return `<section class="card" style="padding:18px;">
    <div class="flex flex-wrap items-end justify-between gap-2 mb-4">
      <div><h2 class="display text-xl" style="color:var(--foreground);">${title}</h2>${sub ? `<p class="text-xs mt-0.5" style="color:var(--muted-foreground);">${sub}</p>` : ''}</div>
      ${extra}
    </div>
    ${inner}
  </section>`;
}

function _reportsHtml(r) {
  const t = r.leads.totals;
  const funnelSteps = [
    { label: 'Leads', val: t.total, color: 'var(--info)' },
    { label: 'Contactados+', val: t.contacted, color: '#a78bfa' },
    { label: 'Calificados+', val: t.qualified, color: 'var(--success)' },
    { label: 'Ganados', val: t.won, color: 'var(--primary)' },
  ];
  const maxF = Math.max(1, t.total);

  const kpis = `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border" style="border-color:var(--border);background:var(--border);">
      ${[
        { label: 'Leads nuevos', html: countUpHtml(t.total), color: 'var(--info)' },
        { label: 'Conversión a calificado', html: `<span data-count-up="${t.total ? Math.round((t.qualified / t.total) * 100) : 0}" data-count-suffix="%">0%</span>`, color: 'var(--success)' },
        { label: 'Conversión a ganado', html: `<span data-count-up="${t.total ? Math.round((t.won / t.total) * 100) : 0}" data-count-suffix="%">0%</span>`, color: 'var(--primary)' },
        { label: 'Oportunidades ganadas', html: `${countUpHtml(r.deals.won_count)} <span class="text-sm font-normal" style="color:var(--muted-foreground);">· ${fmtMoney(r.deals.won_value)}</span>`, color: 'var(--accent)' },
      ].map((k) => `<div class="kpi-card" style="border:none;border-radius:0;border-left:3px solid ${k.color};">
        <p class="eyebrow" style="color:var(--muted-foreground);">${k.label}</p>
        <p class="font-data text-2xl font-bold mt-2 tnum" style="color:var(--foreground);">${k.html}</p></div>`).join('')}
    </div>`;

  const funnel = _sectionCard('Embudo general', 'Leads creados en el período y hasta dónde avanzaron', t.total ? `
    <div class="space-y-3">${funnelSteps.map((s) => `
      <div class="grid grid-cols-[110px_1fr_60px] items-center gap-3">
        <span class="text-xs" style="color:var(--muted-foreground);">${s.label}</span>
        ${progressBar(Math.round((s.val / maxF) * 100), s.color, 10)}
        <span class="font-data text-sm text-right tnum" style="color:var(--foreground);">${s.val}</span>
      </div>`).join('')}</div>` : emptyState({ headline: 'Sin leads en el período', body: 'Probá con un rango más amplio.' }));

  const bySource = _sectionCard('Embudo por fuente', 'Conversión de cada canal', r.leads.funnel.length ? `
    <div class="table-scroll"><table class="w-full text-sm" style="min-width:640px;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th class="text-left px-3 py-2">Fuente</th><th class="text-right px-3 py-2">Leads</th><th class="text-right px-3 py-2">Hot</th>
        <th class="text-right px-3 py-2">Score prom.</th><th class="text-right px-3 py-2">Calif.+</th><th class="text-right px-3 py-2">Ganados</th>
        <th class="text-left px-3 py-2" style="width:160px;">Conv. a ganado</th></tr></thead>
      <tbody>${r.leads.funnel.map((f) => `
        <tr class="data-row" style="border-top:1px solid var(--border);">
          <td class="px-3 py-2" style="color:var(--foreground);">${_srcName(f.source)}</td>
          <td class="px-3 py-2 text-right font-data">${f.total}</td>
          <td class="px-3 py-2 text-right font-data" style="color:var(--danger);">${f.hot}</td>
          <td class="px-3 py-2 text-right font-data" style="color:var(--muted-foreground);">${f.avg_score ?? '—'}</td>
          <td class="px-3 py-2 text-right font-data">${f.qualified + f.won} <span class="text-[11px]" style="color:var(--muted-foreground);">${f.conv_qualified_pct}%</span></td>
          <td class="px-3 py-2 text-right font-data" style="color:var(--primary);">${f.won}</td>
          <td class="px-3 py-2"><div class="flex items-center gap-2">${progressBar(f.conv_won_pct, 'var(--primary)', 6)}<span class="font-data text-xs w-9 text-right">${f.conv_won_pct}%</span></div></td>
        </tr>`).join('')}</tbody></table></div>` : emptyState({ headline: 'Sin datos por fuente' }),
    '<button type="button" class="btn-ghost text-xs no-print" onclick="_exportReportCsv(\'funnel\')">CSV</button>');

  const maxM = Math.max(1, ...r.deals.by_month.map((m) => m.won_value));
  const closes = _sectionCard('Cierres por mes', 'Oportunidades ganadas y perdidas', r.deals.by_month.length ? `
    <div class="space-y-2.5">${r.deals.by_month.map((m) => `
      <div class="grid grid-cols-[70px_1fr_auto] items-center gap-3">
        <span class="font-data text-xs" style="color:var(--muted-foreground);">${m.month}</span>
        ${progressBar(Math.round((m.won_value / maxM) * 100), 'linear-gradient(90deg,var(--primary),var(--accent))', 10)}
        <span class="font-data text-xs text-right" style="color:var(--foreground);">${fmtMoney(m.won_value)} · ${m.won_count}✓ ${m.lost_count ? `· ${m.lost_count}✗` : ''}</span>
      </div>`).join('')}</div>` : emptyState({ headline: 'Sin cierres en el período', body: 'Se cuentan las oportunidades que pasan a Ganado o Perdido en Pipeline deals.' }));

  const owners = r.deals.by_owner.length ? `
    <p class="eyebrow mt-5 mb-2" style="color:var(--muted-foreground);">Oportunidades por responsable</p>
    ${r.deals.by_owner.map((o) => `<div class="flex items-center justify-between gap-3 py-1.5" style="border-top:1px solid var(--border);">
      <div class="flex items-center gap-2">${avatarHtml(o.user.name, { size: 22 })}<span class="text-sm" style="color:var(--foreground);">${_escHtml(o.user.name)}</span></div>
      <span class="font-data text-xs" style="color:var(--muted-foreground);">${o.deals} opp · ${o.won} ganadas · ${fmtMoney(o.won_value)} · abierto ${fmtMoney(o.open_value)}</span>
    </div>`).join('')}` : '';

  const activity = _sectionCard('Actividad por responsable', `${r.activity.total} actividades registradas (personas y agentes)`, r.activity.by_actor.length ? `
    <div class="table-scroll"><table class="w-full text-sm" style="min-width:520px;">
      <thead><tr style="border-bottom:1px solid var(--border);"><th class="text-left px-3 py-2">Quién</th><th class="text-right px-3 py-2">Total</th><th class="text-right px-3 py-2">Notas</th><th class="text-right px-3 py-2">Llamadas</th><th class="text-right px-3 py-2">Emails</th><th class="text-right px-3 py-2">Tareas</th><th class="text-right px-3 py-2">Agente</th></tr></thead>
      <tbody>${r.activity.by_actor.map((a) => `<tr class="data-row" style="border-top:1px solid var(--border);">
        <td class="px-3 py-2"><div class="flex items-center gap-2">${avatarHtml(a.name, { size: 22 })}<span style="color:var(--foreground);">${_escHtml(a.name)}</span></div></td>
        <td class="px-3 py-2 text-right font-data">${a.total}</td><td class="px-3 py-2 text-right font-data">${a.note || 0}</td><td class="px-3 py-2 text-right font-data">${a.call || 0}</td>
        <td class="px-3 py-2 text-right font-data">${a.email || 0}</td><td class="px-3 py-2 text-right font-data">${a.task || 0}</td><td class="px-3 py-2 text-right font-data">${a.agent || 0}</td></tr>`).join('')}</tbody></table></div>${owners}`
    : emptyState({ headline: 'Sin actividad registrada', body: 'Las notas, llamadas y movimientos de pipeline aparecen acá.' }) + owners);

  const agents = _sectionCard('Agentes IA', 'Ejecuciones en el período', r.agents.length ? `
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">${r.agents.map((a) => `
      <div class="rounded-xl p-3" style="background:var(--elevated);border:1px solid var(--border);">
        <p class="eyebrow" style="color:var(--muted-foreground);">${_escHtml(agentInfo[a.agent_id]?.name || a.agent_id)}</p>
        <p class="font-data text-2xl font-bold mt-1" style="color:var(--foreground);">${countUpHtml(a.runs)}</p>
        <p class="text-[11px] mt-0.5" style="color:var(--muted-foreground);">${a.completed} ok · <span style="color:${a.failed ? 'var(--danger)' : 'inherit'};">${a.failed} fallidas</span>${a.tokens ? ` · ${a.tokens.toLocaleString('es-AR')} tokens` : ''}</p>
      </div>`).join('')}</div>` : emptyState({ headline: 'Sin ejecuciones de agentes en el período' }));

  const campaigns = _sectionCard('Rendimiento de campañas', 'Análisis del Agente Performance', r.campaigns.length ? `
    <div class="space-y-2">${r.campaigns.map((c) => `
      <a href="#agent/performance" class="block rounded-xl p-3 transition" style="background:var(--elevated);border:1px solid var(--border);text-decoration:none;">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-medium" style="color:var(--foreground);">${_escHtml(c.client || 'Cuenta propia')} · <span class="font-data text-xs" style="color:var(--muted-foreground);">${c.period_since} → ${c.period_until}</span></p>
          <div class="flex gap-1.5">${c.alerts ? `<span class="badge badge-danger">${c.alerts} alertas</span>` : ''}${c.pending_actions ? `<span class="badge badge-warning">${c.pending_actions} por aprobar</span>` : ''}<span class="badge badge-neutral">${_escHtml(c.status)}</span></div>
        </div>
        ${c.summary ? `<p class="text-xs mt-1.5 leading-relaxed" style="color:var(--muted-foreground);">${_escHtml(String(c.summary).slice(0, 260))}${String(c.summary).length > 260 ? '…' : ''}</p>` : ''}
        ${c.channels?.length ? `<p class="text-[11px] mt-1 font-data" style="color:var(--muted-foreground);">${c.channels.map(_escHtml).join(' · ')}</p>` : ''}
      </a>`).join('')}</div>` : emptyState({ headline: 'Sin análisis de campañas en el período', body: 'Se generan desde Agentes IA → Performance.' }));

  const monthly = _sectionCard('Reportes mensuales', 'Generados por el Agente Reporting', r.monthly_reports.length ? `
    <div class="grid md:grid-cols-2 gap-3">${r.monthly_reports.map((m) => `
      <a href="#agent/reporting" class="block rounded-xl p-3" style="background:var(--elevated);border:1px solid var(--border);text-decoration:none;">
        <div class="flex items-center justify-between gap-2"><p class="eyebrow">${_escHtml(m.month)} · ${_escHtml(m.client || '—')}</p><span class="badge badge-neutral">${_escHtml(m.status)}</span></div>
        ${m.headline ? `<p class="text-sm mt-1.5" style="color:var(--foreground);">${_escHtml(m.headline)}</p>` : ''}
        ${(m.key_metrics || []).length ? `<div class="flex flex-wrap gap-1.5 mt-2">${m.key_metrics.slice(0, 6).map((k) => `<span class="badge ${k.highlight ? 'badge-primary' : 'badge-neutral'}">${_escHtml(k.metric)}: ${_escHtml(k.value)}${k.vs_previous ? ` (${_escHtml(k.vs_previous)})` : ''}</span>`).join('')}</div>` : ''}
      </a>`).join('')}</div>` : emptyState({ headline: 'Sin reportes mensuales en el período', body: 'Se generan desde Agentes IA → Reporting.' }));

  return `<div class="space-y-5">${kpis}<div class="grid lg:grid-cols-2 gap-5">${funnel}${closes}</div>${bySource}${activity}${agents}${campaigns}${monthly}</div>`;
}

function _exportReportCsv(section) {
  if (!_reportData) return;
  const r = _reportData;
  const tag = `${r.from}_${r.to}`;
  if (section === 'funnel' || !section) {
    downloadCsv(`informe-embudo-fuente-${tag}.csv`, r.leads.funnel, [
      { label: 'Fuente', get: (f) => _srcName(f.source).replace(/^[^\w¡¿]+\s*/u, '') },
      { label: 'Leads', key: 'total' }, { label: 'Nuevos', key: 'new' }, { label: 'Contactados', key: 'contacted' },
      { label: 'Calificados', key: 'qualified' }, { label: 'Ganados', key: 'won' }, { label: 'Perdidos', key: 'lost' },
      { label: 'Hot', key: 'hot' }, { label: 'Warm', key: 'warm' }, { label: 'Cold', key: 'cold' },
      { label: 'Score promedio', key: 'avg_score' }, { label: '% a calificado', key: 'conv_qualified_pct' }, { label: '% a ganado', key: 'conv_won_pct' },
    ]);
  }
  if (!section) {
    downloadCsv(`informe-cierres-${tag}.csv`, r.deals.by_month, [
      { label: 'Mes', key: 'month' }, { label: 'Ganadas', key: 'won_count' }, { label: 'Importe ganado', key: 'won_value' }, { label: 'Perdidas', key: 'lost_count' },
    ]);
    downloadCsv(`informe-actividad-${tag}.csv`, r.activity.by_actor, [
      { label: 'Responsable', key: 'name' }, { label: 'Total', key: 'total' }, { label: 'Notas', key: 'note' }, { label: 'Llamadas', key: 'call' },
      { label: 'Emails', key: 'email' }, { label: 'Tareas', key: 'task' }, { label: 'Agente', key: 'agent' },
    ]);
    downloadCsv(`informe-campanas-${tag}.csv`, r.campaigns, [
      { label: 'Cliente', key: 'client' }, { label: 'Desde', key: 'period_since' }, { label: 'Hasta', key: 'period_until' }, { label: 'Estado', key: 'status' },
      { label: 'Canales', get: (c) => (c.channels || []).join(' ') }, { label: 'Alertas', key: 'alerts' }, { label: 'Acciones pendientes', key: 'pending_actions' }, { label: 'Resumen', key: 'summary' },
    ]);
  }
}
