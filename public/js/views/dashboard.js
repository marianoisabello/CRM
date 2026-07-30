async function renderDashboard(root) {
  const res = await api('/api/leads/stats');
  if (!res?.ok || !res?.stats) {
    root.innerHTML = emptyState({
      headline: 'Error cargando dashboard',
      body: 'No se pudieron obtener las estadísticas.',
      actionLabel: 'Reintentar',
      actionOnclick: "renderDashboard(document.getElementById('view-root'))",
    });
    return;
  }
  const { stats } = res;
  const c = stats.by_classification || {};
  const s = stats.by_status || {};

  const srcColors = {
    web_form: 'var(--info)', manychat: 'var(--success)', instagram: '#ec4899',
    whatsapp: 'var(--primary)', linkedin: 'var(--info)', email: 'var(--warning)', database_import: 'var(--muted-foreground)',
  };
  const sourceRows = Object.entries(stats.by_source || {})
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => {
      const pct = stats.total ? Math.round(count / stats.total * 100) : 0;
      return `<div class="flex items-center gap-3 py-1.5">
        <span class="text-xs w-32 shrink-0 truncate" style="color:var(--muted-foreground);">${sourceLabel[src] || src}</span>
        <div class="flex-1">${progressBar(pct, srcColors[src]||'var(--primary)', 6)}</div>
        <span class="font-data text-xs w-6 text-right tnum" style="color:var(--foreground);">${count}</span>
        <span class="font-data text-xs w-8 text-right" style="color:var(--muted-foreground);">${pct}%</span>
      </div>`;
    }).join('');

  const pipelineItems = [
    { label: 'Nuevos',      val: s.new       || 0, color: 'var(--info)' },
    { label: 'Contactados', val: s.contacted  || 0, color: '#a78bfa' },
    { label: 'Calificados', val: s.qualified  || 0, color: 'var(--success)' },
    { label: 'Ganados',     val: s.won        || 0, color: 'var(--primary)' },
    { label: 'Perdidos',    val: s.lost       || 0, color: 'var(--muted-foreground)' },
  ];
  const pipelineTotal = pipelineItems.reduce((a, p) => a + p.val, 0);

  const recentRows = (stats.recent_leads || []).map(l => `
    <div class="flex items-center justify-between py-2.5 cursor-pointer -mx-5 px-5 rounded-lg transition"
         style="border-bottom:1px solid var(--border);"
         onmouseover="this.style.background='var(--elevated)'" onmouseout="this.style.background=''"
         onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
      <div class="flex items-center gap-2.5 min-w-0">
        ${avatarHtml(l.name || '?', { size: 28 })}
        <div class="min-w-0">
          <p class="text-sm font-medium truncate" style="color:var(--foreground);">${l.name || 'Sin nombre'}</p>
          <p class="text-xs mt-0.5 font-data" style="color:var(--muted-foreground);">${fmtDate(l.created_at)}</p>
        </div>
      </div>
      <div class="flex items-center gap-2.5 shrink-0 ml-3">
        ${scoreBar(l.score)}
        ${classificationBadge(l.classification)}
      </div>
    </div>`).join('');

  root.innerHTML = `
    <div class="space-y-5 anim-fade-up">
      <div class="aura grid-bg relative overflow-hidden rounded-xl border px-5 py-8 md:px-8" style="border-color:var(--border);">
        <div class="relative flex flex-wrap items-end justify-between gap-3">
          <div class="flex flex-col gap-2">
            ${eyebrow('Panel comercial')}
            <h1 class="display text-3xl md:text-4xl" style="color:var(--foreground);">Dashboard</h1>
            <p class="text-sm" style="color:var(--muted-foreground);">Visión general · todos los canales</p>
          </div>
          <span class="font-data text-xs px-3 py-1.5 rounded-full" style="background:var(--elevated);border:1px solid var(--border);color:var(--muted-foreground);">${new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px overflow-hidden rounded-xl border" style="border-color:var(--border);background:var(--border);">
        <div class="kpi-card" style="border:none;border-radius:0;border-left:3px solid var(--info);">
          <div class="flex items-start justify-between mb-3">
            <p class="eyebrow" style="color:var(--muted-foreground);">Total</p>
            <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background:var(--info-soft);color:var(--info);">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
          <p class="font-data text-3xl font-bold tnum" style="color:var(--foreground);">${countUpHtml(stats.total || 0)}</p>
          <p class="text-xs mt-1" style="color:var(--muted-foreground);">Score prom. <span class="font-data" style="color:var(--foreground);">${stats.avg_score || 0}</span></p>
        </div>
        <div class="kpi-card" style="border:none;border-radius:0;border-left:3px solid var(--danger);">
          <div class="flex items-start justify-between mb-3">
            <p class="eyebrow" style="color:var(--muted-foreground);">Hot</p>
            <span class="text-base leading-none">🔥</span>
          </div>
          <p class="font-data text-3xl font-bold tnum" style="color:var(--danger);">${countUpHtml(c.hot || 0)}</p>
          <p class="text-xs mt-1" style="color:var(--muted-foreground);">Agendar reunión</p>
        </div>
        <div class="kpi-card" style="border:none;border-radius:0;border-left:3px solid var(--warning);">
          <div class="flex items-start justify-between mb-3">
            <p class="eyebrow" style="color:var(--muted-foreground);">Warm</p>
            <span class="text-base leading-none">☀️</span>
          </div>
          <p class="font-data text-3xl font-bold tnum" style="color:var(--warning);">${countUpHtml(c.warm || 0)}</p>
          <p class="text-xs mt-1" style="color:var(--muted-foreground);">Enviar info</p>
        </div>
        <div class="kpi-card" style="border:none;border-radius:0;border-left:3px solid var(--info);">
          <div class="flex items-start justify-between mb-3">
            <p class="eyebrow" style="color:var(--muted-foreground);">Cold</p>
            <span class="text-base leading-none">❄️</span>
          </div>
          <p class="font-data text-3xl font-bold tnum" style="color:var(--info);">${countUpHtml(c.cold || 0)}</p>
          <p class="text-xs mt-1" style="color:var(--muted-foreground);">Nutrir</p>
        </div>
        <div class="kpi-card" style="border:none;border-radius:0;border-left:3px solid var(--primary);">
          <div class="flex items-start justify-between mb-3">
            <p class="eyebrow" style="color:var(--muted-foreground);">Ganados</p>
            <span class="text-base leading-none">✅</span>
          </div>
          <p class="font-data text-3xl font-bold tnum" style="color:var(--primary);">${countUpHtml(s.won || 0)}</p>
          <p class="text-xs mt-1" style="color:var(--muted-foreground);">Clientes activos</p>
        </div>
      </div>

      ${(() => {
        const a = stats.agents || {};
        const items = [
          { label: 'Perfiles', val: a.perfiles || 0, href: '#agent/analyst', color: 'var(--info)' },
          { label: 'Reuniones', val: a.reuniones || 0, href: '#agent/reuniones', color: 'var(--primary)' },
          { label: 'Briefings', val: a.briefings || 0, href: '#agent/briefing', color: 'var(--accent)' },
          { label: 'Performance', val: a.performance_reports || 0, href: '#agent/performance', color: 'var(--warning)' },
          { label: 'Reporting', val: a.monthly_reports || 0, href: '#agent/reporting', color: 'var(--success)' },
          { label: 'Clientes', val: a.clients_active || 0, href: '#agent/reporting', color: 'var(--muted-foreground)' },
        ];
        return `<div class="card">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-sm" style="color:var(--foreground);">Pipeline de agentes</h2>
            <span class="text-xs" style="color:var(--muted-foreground);">conteos CRM</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            ${items.map((it) => `
              <a href="${it.href}" class="rounded-xl p-3 border transition block" style="border-color:var(--border);border-left:3px solid ${it.color};background:var(--elevated);"
                 onmouseover="this.style.borderColor='rgb(43 212 189 / 0.35)'" onmouseout="this.style.borderColor='var(--border)'">
                <p class="eyebrow" style="color:var(--muted-foreground);">${it.label}</p>
                <p class="font-data text-2xl font-bold mt-1 tnum" style="color:var(--foreground);">${countUpHtml(it.val)}</p>
              </a>`).join('')}
          </div>
        </div>`;
      })()}

      <div class="grid lg:grid-cols-3 gap-4">
        <div class="card space-y-1">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-sm" style="color:var(--foreground);">Leads por canal</h2>
            <span class="font-data text-xs" style="color:var(--muted-foreground);">${stats.total || 0} total</span>
          </div>
          <div class="space-y-0.5">
            ${sourceRows || '<p class="text-sm py-4 text-center" style="color:var(--muted-foreground);">Sin datos</p>'}
          </div>
        </div>

        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-sm" style="color:var(--foreground);">Pipeline</h2>
            <span class="font-data text-xs" style="color:var(--muted-foreground);">${pipelineTotal} leads</span>
          </div>
          <div class="space-y-3.5">
            ${pipelineItems.map(p => `
              <div>
                <div class="flex justify-between text-xs mb-1.5">
                  <span style="color:var(--muted-foreground);">${p.label}</span>
                  <span class="font-data font-medium tnum" style="color:var(--foreground);">${p.val}</span>
                </div>
                ${progressBar(pipelineTotal ? Math.round(p.val/pipelineTotal*100) : 0, p.color, 6)}
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
      </div>
    </div>`;
}
