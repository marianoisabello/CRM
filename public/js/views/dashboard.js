async function renderDashboard(root) {
  const { stats } = await api('/api/leads/stats');
  const c = stats.by_classification || {};
  const s = stats.by_status || {};

  const sourceRows = Object.entries(stats.by_source || {})
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => {
      const pct = stats.total ? Math.round(count / stats.total * 100) : 0;
      const srcColors = {
        web_form: 'bg-violet-500', manychat: 'bg-green-500', instagram: 'bg-pink-500',
        whatsapp: 'bg-emerald-500', linkedin: 'bg-sky-500', email: 'bg-amber-500', database_import: 'bg-gray-500',
      };
      return `<div class="flex items-center gap-3 py-1">
        <span class="text-gray-400 text-xs w-32 shrink-0 truncate">${sourceLabel[src] || src}</span>
        <div class="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div class="${srcColors[src] || 'bg-violet-500'} h-full rounded-full transition-all" style="width:${pct}%"></div>
        </div>
        <span class="text-gray-300 text-xs font-mono w-6 text-right">${count}</span>
        <span class="text-gray-600 text-xs w-8 text-right">${pct}%</span>
      </div>`;
    }).join('');

  const pipelineItems = [
    { label: 'Nuevos',      val: s.new       || 0, color: 'bg-violet-500' },
    { label: 'Contactados', val: s.contacted  || 0, color: 'bg-sky-500'   },
    { label: 'Calificados', val: s.qualified  || 0, color: 'bg-emerald-500'},
    { label: 'Ganados',     val: s.won        || 0, color: 'bg-green-500'  },
    { label: 'Perdidos',    val: s.lost       || 0, color: 'bg-gray-600'   },
  ];
  const pipelineTotal = pipelineItems.reduce((a, p) => a + p.val, 0);

  const recentRows = (stats.recent_leads || []).map(l => `
    <div class="flex items-center justify-between py-2.5 border-b border-gray-800/40 last:border-0 cursor-pointer hover:bg-gray-800/20 -mx-5 px-5 transition"
         onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
      <div class="min-w-0">
        <p class="text-sm font-medium truncate">${l.name || 'Sin nombre'}</p>
        <p class="text-xs text-gray-600 mt-0.5">${sourceLabel[l.source] || l.source} · ${fmtDate(l.created_at)}</p>
      </div>
      <div class="flex items-center gap-2.5 shrink-0 ml-3">
        ${scoreBar(l.score)}
        ${classificationBadge(l.classification)}
      </div>
    </div>`).join('');

  root.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">Dashboard</h1>
          <p class="text-gray-500 text-sm mt-0.5">Visión general · todos los canales</p>
        </div>
        <span class="text-xs text-gray-600 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg">${new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}</span>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div class="kpi-card lg:col-span-1">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Total</p>
            <div class="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-bold">${stats.total || 0}</p>
          <p class="text-xs text-gray-600 mt-1">Score prom. <span class="text-gray-400">${stats.avg_score || 0}</span></p>
        </div>
        <div class="kpi-card border-red-900/30">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Hot</p>
            <span class="text-base leading-none">🔥</span>
          </div>
          <p class="text-3xl font-bold text-red-400">${c.hot || 0}</p>
          <p class="text-xs text-gray-600 mt-1">Agendar reunión</p>
        </div>
        <div class="kpi-card border-amber-900/30">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Warm</p>
            <span class="text-base leading-none">☀️</span>
          </div>
          <p class="text-3xl font-bold text-amber-400">${c.warm || 0}</p>
          <p class="text-xs text-gray-600 mt-1">Enviar info</p>
        </div>
        <div class="kpi-card border-blue-900/30">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Cold</p>
            <span class="text-base leading-none">❄️</span>
          </div>
          <p class="text-3xl font-bold text-blue-400">${c.cold || 0}</p>
          <p class="text-xs text-gray-600 mt-1">Nutrir</p>
        </div>
        <div class="kpi-card border-green-900/30">
          <div class="flex items-start justify-between mb-3">
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Ganados</p>
            <span class="text-base leading-none">✅</span>
          </div>
          <p class="text-3xl font-bold text-green-400">${s.won || 0}</p>
          <p class="text-xs text-gray-600 mt-1">Clientes activos</p>
        </div>
      </div>

      <!-- Fila inferior -->
      <div class="grid lg:grid-cols-3 gap-4">
        <!-- Por canal -->
        <div class="card space-y-1">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-sm">Leads por canal</h2>
            <span class="text-xs text-gray-600">${stats.total || 0} total</span>
          </div>
          <div class="space-y-0.5">
            ${sourceRows || '<p class="text-gray-600 text-sm py-4 text-center">Sin datos</p>'}
          </div>
        </div>

        <!-- Pipeline -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-sm">Pipeline</h2>
            <span class="text-xs text-gray-600">${pipelineTotal} leads</span>
          </div>
          <div class="space-y-3.5">
            ${pipelineItems.map(p => `
              <div>
                <div class="flex justify-between text-xs mb-1.5">
                  <span class="text-gray-400">${p.label}</span>
                  <span class="text-gray-300 font-mono">${p.val}</span>
                </div>
                <div class="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div class="${p.color} h-full rounded-full transition-all" style="width:${pipelineTotal ? Math.round(p.val/pipelineTotal*100) : 0}%"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Recientes -->
        <div class="card">
          <div class="flex items-center justify-between mb-1">
            <h2 class="font-semibold text-sm">Últimos leads</h2>
            <button onclick="navigate('leads')" class="text-xs text-violet-400 hover:text-violet-300 transition">Ver todos →</button>
          </div>
          ${recentRows || '<p class="text-gray-600 text-sm py-8 text-center">Sin leads aún</p>'}
        </div>
      </div>
    </div>`;
}
