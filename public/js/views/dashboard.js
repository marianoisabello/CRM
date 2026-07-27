async function renderDashboard(root) {
  const res = await api('/api/leads/stats');
  if (!res?.ok || !res?.stats) {
    root.innerHTML = `<div class="flex flex-col items-center justify-center h-64" style="color:#9CA3AF;">
      <svg class="w-8 h-8 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <p class="text-sm">Error cargando dashboard</p>
      <button onclick="renderDashboard(document.getElementById('view-root'))" class="mt-3 text-xs transition" style="color:#2563EB;">Reintentar</button>
    </div>`;
    return;
  }
  const { stats } = res;
  const c = stats.by_classification || {};
  const s = stats.by_status || {};

  const srcColors = {
    web_form: '#2563EB', manychat: '#10B981', instagram: '#EC4899',
    whatsapp: '#059669', linkedin: '#0EA5E9', email: '#F59E0B', database_import: '#6B7280',
  };
  const sourceRows = Object.entries(stats.by_source || {})
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => {
      const pct = stats.total ? Math.round(count / stats.total * 100) : 0;
      return `<div class="flex items-center gap-3 py-1.5">
        <span class="text-xs w-32 shrink-0 truncate" style="color:#6B7280;">${sourceLabel[src] || src}</span>
        <div class="flex-1 h-1.5 rounded-full overflow-hidden" style="background:#F3F4F6;">
          <div class="h-full rounded-full transition-all" style="width:${pct}%;background:${srcColors[src]||'#2563EB'};"></div>
        </div>
        <span class="font-data text-xs w-6 text-right" style="color:#111827;">${count}</span>
        <span class="font-data text-xs w-8 text-right" style="color:#9CA3AF;">${pct}%</span>
      </div>`;
    }).join('');

  const pipelineItems = [
    { label: 'Nuevos',      val: s.new       || 0, color: '#2563EB' },
    { label: 'Contactados', val: s.contacted  || 0, color: '#0EA5E9' },
    { label: 'Calificados', val: s.qualified  || 0, color: '#10B981' },
    { label: 'Ganados',     val: s.won        || 0, color: '#059669' },
    { label: 'Perdidos',    val: s.lost       || 0, color: '#D1D5DB' },
  ];
  const pipelineTotal = pipelineItems.reduce((a, p) => a + p.val, 0);

  const recentRows = (stats.recent_leads || []).map(l => `
    <div class="flex items-center justify-between py-2.5 cursor-pointer -mx-5 px-5 rounded transition"
         style="border-bottom:1px solid #F3F4F6;"
         onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background=''"
         onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style="background:#EFF6FF;color:#2563EB;">${_avatarInitials(l.name)}</div>
        <div class="min-w-0">
          <p class="text-sm font-medium truncate" style="color:#111827;">${l.name || 'Sin nombre'}</p>
          <p class="text-xs mt-0.5 font-data" style="color:#9CA3AF;">${fmtDate(l.created_at)}</p>
        </div>
      </div>
      <div class="flex items-center gap-2.5 shrink-0 ml-3">
        ${scoreBar(l.score)}
        ${classificationBadge(l.classification)}
      </div>
    </div>`).join('');

  root.innerHTML = `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold" style="color:#111827;">Dashboard</h1>
          <p class="text-sm mt-0.5" style="color:#6B7280;">Visión general · todos los canales</p>
        </div>
        <span class="font-data text-xs px-3 py-1.5 rounded-lg" style="background:white;border:1px solid #E5E7EB;color:#6B7280;">${new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}</span>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div class="kpi-card" style="border-left:3px solid #2563EB;">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs font-semibold uppercase tracking-wider" style="color:#6B7280;">Total</p>
            <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:#EFF6FF;">
              <svg class="w-3.5 h-3.5" style="color:#2563EB;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
          <p class="font-data text-3xl font-bold" style="color:#111827;">${stats.total || 0}</p>
          <p class="text-xs mt-1" style="color:#9CA3AF;">Score prom. <span class="font-data" style="color:#6B7280;">${stats.avg_score || 0}</span></p>
        </div>
        <div class="kpi-card" style="border-left:3px solid #EF4444;">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs font-semibold uppercase tracking-wider" style="color:#6B7280;">Hot</p>
            <span class="text-base leading-none">🔥</span>
          </div>
          <p class="font-data text-3xl font-bold" style="color:#EF4444;">${c.hot || 0}</p>
          <p class="text-xs mt-1" style="color:#9CA3AF;">Agendar reunión</p>
        </div>
        <div class="kpi-card" style="border-left:3px solid #F59E0B;">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs font-semibold uppercase tracking-wider" style="color:#6B7280;">Warm</p>
            <span class="text-base leading-none">☀️</span>
          </div>
          <p class="font-data text-3xl font-bold" style="color:#F59E0B;">${c.warm || 0}</p>
          <p class="text-xs mt-1" style="color:#9CA3AF;">Enviar info</p>
        </div>
        <div class="kpi-card" style="border-left:3px solid #3B82F6;">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs font-semibold uppercase tracking-wider" style="color:#6B7280;">Cold</p>
            <span class="text-base leading-none">❄️</span>
          </div>
          <p class="font-data text-3xl font-bold" style="color:#3B82F6;">${c.cold || 0}</p>
          <p class="text-xs mt-1" style="color:#9CA3AF;">Nutrir</p>
        </div>
        <div class="kpi-card" style="border-left:3px solid #10B981;">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs font-semibold uppercase tracking-wider" style="color:#6B7280;">Ganados</p>
            <span class="text-base leading-none">✅</span>
          </div>
          <p class="font-data text-3xl font-bold" style="color:#10B981;">${s.won || 0}</p>
          <p class="text-xs mt-1" style="color:#9CA3AF;">Clientes activos</p>
        </div>
      </div>

      <!-- Métricas por agente (semana 4) -->
      ${(() => {
        const a = stats.agents || {};
        const items = [
          { label: 'Perfiles', val: a.perfiles || 0, href: '#agent/analyst', color: '#2563EB' },
          { label: 'Reuniones', val: a.reuniones || 0, href: '#agent/reuniones', color: '#0EA5E9' },
          { label: 'Briefings', val: a.briefings || 0, href: '#agent/briefing', color: '#8B5CF6' },
          { label: 'Performance', val: a.performance_reports || 0, href: '#agent/performance', color: '#F59E0B' },
          { label: 'Reporting', val: a.monthly_reports || 0, href: '#agent/reporting', color: '#10B981' },
          { label: 'Clientes', val: a.clients_active || 0, href: '#agent/reporting', color: '#64748B' },
        ];
        return `<div class="card">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-sm" style="color:#111827;">Pipeline de agentes</h2>
            <span class="text-xs" style="color:#9CA3AF;">conteos CRM</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            ${items.map((it) => `
              <a href="${it.href}" class="rounded-lg p-3 border transition block" style="border-color:#E5E7EB;border-left:3px solid ${it.color};"
                 onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background=''">
                <p class="text-xs font-semibold uppercase tracking-wider" style="color:#6B7280;">${it.label}</p>
                <p class="font-data text-2xl font-bold mt-1" style="color:#111827;">${it.val}</p>
              </a>`).join('')}
          </div>
        </div>`;
      })()}

      <!-- Fila inferior -->
      <div class="grid lg:grid-cols-3 gap-4">
        <div class="card space-y-1">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-sm" style="color:#111827;">Leads por canal</h2>
            <span class="font-data text-xs" style="color:#9CA3AF;">${stats.total || 0} total</span>
          </div>
          <div class="space-y-0.5">
            ${sourceRows || '<p class="text-sm py-4 text-center" style="color:#9CA3AF;">Sin datos</p>'}
          </div>
        </div>

        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-sm" style="color:#111827;">Pipeline</h2>
            <span class="font-data text-xs" style="color:#9CA3AF;">${pipelineTotal} leads</span>
          </div>
          <div class="space-y-3.5">
            ${pipelineItems.map(p => `
              <div>
                <div class="flex justify-between text-xs mb-1.5">
                  <span style="color:#6B7280;">${p.label}</span>
                  <span class="font-data font-medium" style="color:#111827;">${p.val}</span>
                </div>
                <div class="h-1.5 rounded-full overflow-hidden" style="background:#F3F4F6;">
                  <div class="h-full rounded-full transition-all" style="width:${pipelineTotal ? Math.round(p.val/pipelineTotal*100) : 0}%;background:${p.color};"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="flex items-center justify-between mb-1">
            <h2 class="font-semibold text-sm" style="color:#111827;">Últimos leads</h2>
            <button onclick="navigate('leads')" class="text-xs transition" style="color:#2563EB;">Ver todos →</button>
          </div>
          ${recentRows || '<p class="text-sm py-8 text-center" style="color:#9CA3AF;">Sin leads aún</p>'}
        </div>
      </div>
    </div>`;
}
