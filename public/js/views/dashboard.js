async function renderDashboard(root) {
  const { stats } = await api('/api/leads/stats');
  const c = stats.by_classification;
  const s = stats.by_status;

  const sourceRows = Object.entries(stats.by_source)
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => {
      const pct = stats.total ? Math.round(count / stats.total * 100) : 0;
      const colors = {
        web_form: 'bg-emerald-500', manychat: 'bg-blue-500', instagram: 'bg-pink-500',
        whatsapp: 'bg-green-500', linkedin: 'bg-sky-500', email: 'bg-amber-500', database_import: 'bg-gray-500'
      };
      return `<div class="flex items-center gap-3 py-1.5">
        <span class="text-gray-400 text-[13px] w-28 shrink-0 truncate">${sourceLabel[src] || src}</span>
        <div class="flex-1 h-2 bg-gray-800/60 rounded-full overflow-hidden">
          <div class="${colors[src] || 'bg-violet-500'} h-full rounded-full transition-all duration-500" style="width:${pct}%"></div>
        </div>
        <span class="text-gray-300 text-[13px] font-mono w-8 text-right tabular-nums">${count}</span>
      </div>`;
    }).join('');

  const pipelineItems = [
    { label: 'Nuevos', val: s.new || 0, color: 'bg-violet-500', bgColor: 'bg-violet-500/20' },
    { label: 'Contactados', val: s.contacted || 0, color: 'bg-sky-500', bgColor: 'bg-sky-500/20' },
    { label: 'Calificados', val: s.qualified || 0, color: 'bg-emerald-500', bgColor: 'bg-emerald-500/20' },
    { label: 'Ganados', val: s.won || 0, color: 'bg-green-500', bgColor: 'bg-green-500/20' },
    { label: 'Perdidos', val: s.lost || 0, color: 'bg-gray-600', bgColor: 'bg-gray-600/20' },
  ];

  const recentRows = (stats.recent_leads || []).map(l => `
    <div class="flex items-center justify-between py-2.5 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 -mx-2 px-2 rounded-lg transition-colors cursor-pointer" onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
      <div class="min-w-0">
        <p class="text-[13px] font-medium text-gray-100 truncate">${l.name || 'Sin nombre'}</p>
        <p class="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
          ${sourceBadge(l.source)}
          <span class="text-gray-600">·</span>
          <span class="tabular-nums">${fmtDate(l.created_at)}</span>
        </p>
      </div>
      <div class="flex items-center gap-3 shrink-0 ml-3">
        ${scoreBar(l.score)}
        ${classificationBadge(l.classification)}
      </div>
    </div>`).join('');

  root.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-white">Dashboard</h1>
          <p class="text-gray-500 text-[13px] mt-1">Vision general de todos los canales</p>
        </div>
        <div class="text-[11px] text-gray-500 bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700/50">
          Actualizado: ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="card group hover:border-violet-500/30 transition-colors">
          <div class="flex items-center justify-between mb-3">
            <p class="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Total leads</p>
            <div class="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <svg class="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-bold text-white tabular-nums">${stats.total}</p>
          <p class="text-gray-500 text-[11px] mt-2 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            Score promedio: <span class="text-gray-300 font-mono">${stats.avg_score || 0}</span>
          </p>
        </div>
        
        <div class="card group hover:border-red-500/30 transition-colors">
          <div class="flex items-center justify-between mb-3">
            <p class="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Hot</p>
            <div class="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <span class="text-[10px] font-bold text-red-400">HOT</span>
            </div>
          </div>
          <p class="text-3xl font-bold text-red-400 tabular-nums">${c.hot || 0}</p>
          <p class="text-gray-600 text-[11px] mt-2">Score 65+</p>
        </div>
        
        <div class="card group hover:border-amber-500/30 transition-colors">
          <div class="flex items-center justify-between mb-3">
            <p class="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Warm</p>
            <div class="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <span class="text-[10px] font-bold text-amber-400">WRM</span>
            </div>
          </div>
          <p class="text-3xl font-bold text-amber-400 tabular-nums">${c.warm || 0}</p>
          <p class="text-gray-600 text-[11px] mt-2">Score 40-64</p>
        </div>
        
        <div class="card group hover:border-blue-500/30 transition-colors">
          <div class="flex items-center justify-between mb-3">
            <p class="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Cold</p>
            <div class="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <span class="text-[10px] font-bold text-blue-400">CLD</span>
            </div>
          </div>
          <p class="text-3xl font-bold text-blue-400 tabular-nums">${c.cold || 0}</p>
          <p class="text-gray-600 text-[11px] mt-2">Score 0-39</p>
        </div>
        
        <div class="card group hover:border-green-500/30 transition-colors">
          <div class="flex items-center justify-between mb-3">
            <p class="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Ganados</p>
            <div class="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-bold text-green-400 tabular-nums">${s.won || 0}</p>
          <p class="text-gray-600 text-[11px] mt-2">Convertidos</p>
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-5">
        <!-- Por canal -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-[13px] text-white">Leads por canal</h2>
            <span class="text-[11px] text-gray-500">${Object.keys(stats.by_source).length} fuentes</span>
          </div>
          <div class="space-y-1">${sourceRows || '<p class="text-gray-500 text-sm py-4 text-center">Sin datos</p>'}</div>
        </div>

        <!-- Pipeline -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-[13px] text-white">Pipeline</h2>
            <span class="text-[11px] text-gray-500">Por estado</span>
          </div>
          <div class="space-y-4">
            ${pipelineItems.map(p => `
              <div>
                <div class="flex justify-between text-[11px] mb-1.5">
                  <span class="text-gray-400">${p.label}</span>
                  <span class="text-gray-300 font-mono tabular-nums">${p.val}</span>
                </div>
                <div class="h-2 ${p.bgColor} rounded-full overflow-hidden">
                  <div class="${p.color} h-full rounded-full transition-all duration-500" style="width:${stats.total ? Math.round(p.val/stats.total*100) : 0}%"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Recientes -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-[13px] text-white">Ultimos leads</h2>
            <button onclick="navigate('leads')" class="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">Ver todos</button>
          </div>
          <div class="space-y-0.5">
            ${recentRows || '<p class="text-gray-500 text-sm py-4 text-center">Sin leads aun</p>'}
          </div>
        </div>
      </div>
    </div>`;
}
