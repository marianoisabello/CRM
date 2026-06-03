async function renderDashboard(root) {
  const { stats } = await api('/api/leads/stats');
  const c = stats.by_classification;
  const s = stats.by_status;

  const sourceRows = Object.entries(stats.by_source)
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => {
      const pct = stats.total ? Math.round(count / stats.total * 100) : 0;
      return `<div class="flex items-center gap-3">
        <span class="text-gray-400 text-sm w-36 shrink-0">${sourceLabel[src] || src}</span>
        <div class="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div class="bg-violet-500 h-full rounded-full" style="width:${pct}%"></div>
        </div>
        <span class="text-gray-300 text-sm font-mono w-8 text-right">${count}</span>
      </div>`;
    }).join('');

  const pipelineItems = [
    { label: 'Nuevos', val: s.new, color: 'bg-violet-500' },
    { label: 'Contactados', val: s.contacted, color: 'bg-sky-500' },
    { label: 'Calificados', val: s.qualified, color: 'bg-emerald-500' },
    { label: 'Ganados', val: s.won, color: 'bg-green-500' },
    { label: 'Perdidos', val: s.lost, color: 'bg-gray-600' },
  ];

  const recentRows = (stats.recent_leads || []).map(l => `
    <div class="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
      <div>
        <p class="text-sm font-medium">${l.name || 'Sin nombre'}</p>
        <p class="text-xs text-gray-500">${sourceLabel[l.source] || l.source} · ${fmtDate(l.created_at)}</p>
      </div>
      <div class="flex items-center gap-2">
        ${scoreBar(l.score)}
        ${classificationBadge(l.classification)}
      </div>
    </div>`).join('');

  root.innerHTML = `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-gray-500 text-sm">Visión general de todos los canales</p>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="card md:col-span-1">
          <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">Total leads</p>
          <p class="text-4xl font-bold">${stats.total}</p>
          <p class="text-gray-500 text-xs mt-1">Score promedio: ${stats.avg_score}</p>
        </div>
        <div class="card border-red-900/40">
          <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">🔥 Hot</p>
          <p class="text-3xl font-bold text-red-400">${c.hot || 0}</p>
        </div>
        <div class="card border-amber-900/40">
          <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">☀️ Warm</p>
          <p class="text-3xl font-bold text-amber-400">${c.warm || 0}</p>
        </div>
        <div class="card border-blue-900/40">
          <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">❄️ Cold</p>
          <p class="text-3xl font-bold text-blue-400">${c.cold || 0}</p>
        </div>
        <div class="card">
          <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">✓ Ganados</p>
          <p class="text-3xl font-bold text-green-400">${c.won || s.won || 0}</p>
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-6">
        <!-- Por canal -->
        <div class="card space-y-3">
          <h2 class="font-semibold text-sm">Leads por canal</h2>
          <div class="space-y-2">${sourceRows || '<p class="text-gray-500 text-sm">Sin datos</p>'}</div>
        </div>

        <!-- Pipeline -->
        <div class="card space-y-3">
          <h2 class="font-semibold text-sm">Pipeline</h2>
          <div class="space-y-3">
            ${pipelineItems.map(p => `
              <div>
                <div class="flex justify-between text-xs text-gray-400 mb-1">
                  <span>${p.label}</span><span>${p.val || 0}</span>
                </div>
                <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div class="${p.color} h-full rounded-full" style="width:${stats.total ? Math.round((p.val||0)/stats.total*100) : 0}%"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Recientes -->
        <div class="card">
          <h2 class="font-semibold text-sm mb-3">Últimos leads</h2>
          ${recentRows || '<p class="text-gray-500 text-sm">Sin leads aún</p>'}
        </div>
      </div>
    </div>`;
}
