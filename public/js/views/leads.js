async function renderLeads(root, sourceFilter = null) {
  const sourceNames = {
    web_form: 'Formulario web', manychat: 'ManyChat', instagram: 'Instagram',
    whatsapp: 'WhatsApp', linkedin: 'LinkedIn', email: 'Email', database_import: 'Importación',
  };
  const title = sourceFilter ? (sourceLabel[sourceFilter] || sourceFilter) : 'Todos los leads';

  root.innerHTML = `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">${title}</h1>
          <p id="leads-count" class="text-gray-600 text-sm mt-0.5">Cargando...</p>
        </div>
        <div class="flex gap-2">
          <button onclick="exportToSheets('${sourceFilter || ''}')"
            class="flex items-center gap-1.5 text-xs bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/50 transition px-3 py-2 rounded-lg font-medium">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar Sheets
          </button>
          <button onclick="refreshLeads()"
            class="flex items-center gap-1.5 text-xs bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition px-3 py-2 rounded-lg font-medium">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Actualizar
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2 flex-wrap">
        <select id="f-class" onchange="refreshLeads()" class="input" style="width:auto;min-width:160px">
          <option value="">Todas las clasificaciones</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">☀️ Warm</option>
          <option value="cold">❄️ Cold</option>
          <option value="unqualified">✗ No calificado</option>
        </select>
        <select id="f-status" onchange="refreshLeads()" class="input" style="width:auto;min-width:150px">
          <option value="">Todos los estados</option>
          <option value="new">Nuevo</option>
          <option value="contacted">Contactado</option>
          <option value="qualified">Calificado</option>
          <option value="won">Ganado</option>
          <option value="lost">Perdido</option>
        </select>
        ${!sourceFilter ? `
        <select id="f-source" onchange="refreshLeads()" class="input" style="width:auto;min-width:150px">
          <option value="">Todas las fuentes</option>
          ${Object.entries(sourceNames).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>` : ''}
      </div>

      <!-- Tabla -->
      <div id="leads-table-wrap" class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="flex items-center justify-center h-32 text-gray-600 text-sm">Cargando...</div>
      </div>
    </div>`;

  root.dataset.sourceFilter = sourceFilter || '';
  await refreshLeads();
}

async function refreshLeads() {
  const root = document.getElementById('view-root');
  const sourceFilter = root.dataset.sourceFilter || null;

  const params = new URLSearchParams({ limit: '100' });
  const fClass  = document.getElementById('f-class')?.value;
  const fStatus = document.getElementById('f-status')?.value;
  const fSource = document.getElementById('f-source')?.value;

  if (sourceFilter) params.set('source', sourceFilter);
  else if (fSource) params.set('source', fSource);
  if (fClass)  params.set('classification', fClass);
  if (fStatus) params.set('status', fStatus);

  const { leads } = await api(`/api/leads?${params}`);
  const count = leads?.length || 0;
  const countEl = document.getElementById('leads-count');
  if (countEl) countEl.textContent = `${count} lead${count !== 1 ? 's' : ''}`;
  document.getElementById('leads-table-wrap').innerHTML = renderLeadsTable(leads);
}

async function exportToSheets(source) {
  showToast('Generando hoja de cálculo...');
  const body = {};
  if (source) body.source = source;

  const res = await api('/api/export/sheets', { method: 'POST', body });
  if (res?.ok) {
    showToast(`✓ ${res.leads_exported} leads exportados`);
    window.open(res.url, '_blank');
  } else {
    showToast(res?.error || 'Error exportando', 'error');
  }
}
