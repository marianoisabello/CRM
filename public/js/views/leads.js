async function renderLeads(root, sourceFilter = null) {
  const sourceNames = {
    web_form: 'Formulario web', manychat: 'ManyChat', instagram: 'Instagram',
    whatsapp: 'WhatsApp', linkedin: 'LinkedIn', email: 'Email', database_import: 'Importación',
  };
  const title = sourceFilter ? (sourceLabel[sourceFilter] || sourceFilter) : 'Todos los leads';

  root.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">${title}</h1>
          <p id="leads-count" class="text-gray-500 text-sm"></p>
        </div>
        <div class="flex gap-2">
          <button onclick="exportToSheets('${sourceFilter || ''}')"
            class="text-sm bg-green-900/40 border border-green-800 text-green-300 hover:bg-green-900/60 transition px-4 py-2 rounded-lg flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar a Sheets
          </button>
          <button onclick="refreshLeads()" class="text-sm bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-700 transition">
            Actualizar
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-3 flex-wrap">
        <select id="f-class" onchange="refreshLeads()" class="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500">
          <option value="">Todas las clasificaciones</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">☀️ Warm</option>
          <option value="cold">❄️ Cold</option>
          <option value="unqualified">✗ No calificado</option>
        </select>
        <select id="f-status" onchange="refreshLeads()" class="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500">
          <option value="">Todos los estados</option>
          <option value="new">Nuevo</option>
          <option value="contacted">Contactado</option>
          <option value="qualified">Calificado</option>
          <option value="won">Ganado</option>
          <option value="lost">Perdido</option>
        </select>
        ${!sourceFilter ? `
        <select id="f-source" onchange="refreshLeads()" class="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500">
          <option value="">Todas las fuentes</option>
          ${Object.entries(sourceNames).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>` : ''}
      </div>

      <!-- Tabla -->
      <div id="leads-table-wrap" class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="flex items-center justify-center h-32 text-gray-500">Cargando...</div>
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
  document.getElementById('leads-count').textContent = `${leads.length} leads`;
  document.getElementById('leads-table-wrap').innerHTML = renderLeadsTable(leads);
}

async function exportToSheets(source) {
  showToast('Exportando a Google Sheets...');
  const body = {};
  if (source) body.source = source;

  const res = await api('/api/export/sheets', { method: 'POST', body });
  if (res?.ok) {
    showToast('✓ Hoja creada en Google Sheets');
    window.open(res.url, '_blank');
  } else {
    showToast(res?.error || 'Error exportando', 'error');
  }
}
