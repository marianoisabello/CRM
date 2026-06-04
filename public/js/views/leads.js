async function renderLeads(root, sourceFilter = null) {
  const sourceNames = {
    web_form: 'Formulario web', manychat: 'ManyChat', instagram: 'Instagram',
    whatsapp: 'WhatsApp', linkedin: 'LinkedIn', email: 'Email', database_import: 'Importacion',
  };
  const title = sourceFilter ? (sourceLabel[sourceFilter] || sourceFilter) : 'Todos los leads';
  const titleIcon = sourceFilter 
    ? `<span class="w-2 h-2 rounded-full ${sourceColors[sourceFilter]?.includes('emerald') ? 'bg-emerald-500' : sourceColors[sourceFilter]?.includes('blue') ? 'bg-blue-500' : sourceColors[sourceFilter]?.includes('pink') ? 'bg-pink-500' : sourceColors[sourceFilter]?.includes('green') ? 'bg-green-500' : sourceColors[sourceFilter]?.includes('sky') ? 'bg-sky-500' : sourceColors[sourceFilter]?.includes('amber') ? 'bg-amber-500' : 'bg-gray-500'}"></span>`
    : '<svg class="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';

  root.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-white flex items-center gap-3">${titleIcon}${title}</h1>
          <p id="leads-count" class="text-gray-500 text-[13px] mt-1"></p>
        </div>
        <div class="flex gap-2">
          <button onclick="exportToSheets('${sourceFilter || ''}')"
            class="text-[13px] bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar a Sheets
          </button>
          <button onclick="refreshLeads()" class="text-[13px] bg-gray-800/80 border border-gray-700/60 px-3 py-2 rounded-lg hover:bg-gray-700/80 transition-colors flex items-center gap-2 text-gray-300">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-3 flex-wrap">
        <select id="f-class" onchange="refreshLeads()" class="bg-gray-900/80 border border-gray-800/80 rounded-lg px-3 py-2 text-[13px] text-gray-300 focus:border-violet-500 cursor-pointer hover:bg-gray-800/80 transition-colors">
          <option value="">Todas las clasificaciones</option>
          <option value="hot">HOT (65+)</option>
          <option value="warm">WARM (40-64)</option>
          <option value="cold">COLD (0-39)</option>
          <option value="unqualified">No calificado</option>
        </select>
        <select id="f-status" onchange="refreshLeads()" class="bg-gray-900/80 border border-gray-800/80 rounded-lg px-3 py-2 text-[13px] text-gray-300 focus:border-violet-500 cursor-pointer hover:bg-gray-800/80 transition-colors">
          <option value="">Todos los estados</option>
          <option value="new">Nuevo</option>
          <option value="contacted">Contactado</option>
          <option value="qualified">Calificado</option>
          <option value="won">Ganado</option>
          <option value="lost">Perdido</option>
        </select>
        ${!sourceFilter ? `
        <select id="f-source" onchange="refreshLeads()" class="bg-gray-900/80 border border-gray-800/80 rounded-lg px-3 py-2 text-[13px] text-gray-300 focus:border-violet-500 cursor-pointer hover:bg-gray-800/80 transition-colors">
          <option value="">Todas las fuentes</option>
          ${Object.entries(sourceNames).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>` : ''}
      </div>

      <!-- Tabla -->
      <div id="leads-table-wrap" class="bg-gray-900/80 border border-gray-800/80 rounded-xl overflow-hidden">
        <div class="flex items-center justify-center h-32 text-gray-500">
          <svg class="w-5 h-5 spinning mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Cargando...
        </div>
      </div>
    </div>`;

  // Guardar el sourceFilter en el DOM para refreshLeads
  root.dataset.sourceFilter = sourceFilter || '';
  await refreshLeads();
}

async function refreshLeads() {
  const root = document.getElementById('view-root');
  const sourceFilter = root.dataset.sourceFilter || null;

  const params = new URLSearchParams({ limit: '100' });
  const fClass = document.getElementById('f-class')?.value;
  const fStatus = document.getElementById('f-status')?.value;
  const fSource = document.getElementById('f-source')?.value;

  if (sourceFilter) params.set('source', sourceFilter);
  else if (fSource) params.set('source', fSource);
  if (fClass) params.set('classification', fClass);
  if (fStatus) params.set('status', fStatus);

  const { leads } = await api(`/api/leads?${params}`);
  document.getElementById('leads-count').textContent = `${leads.length} leads encontrados`;
  document.getElementById('leads-table-wrap').innerHTML = renderLeadsTable(leads);
}

async function exportToSheets(source) {
  showToast('Exportando a Google Sheets...');
  const body = {};
  if (source) body.source = source;

  const res = await api('/api/export/sheets', { method: 'POST', body });
  if (res?.ok) {
    showToast('Hoja creada en Google Sheets');
    window.open(res.url, '_blank');
  } else {
    showToast(res?.error || 'Error exportando', 'error');
  }
}
