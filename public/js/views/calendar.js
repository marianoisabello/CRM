async function renderCalendar(root) {
  root.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">📅 Calendario</h1>
          <p class="text-gray-500 text-sm">Reuniones y seguimientos</p>
        </div>
        <button onclick="openNewMeetingForm()"
          class="bg-violet-600 hover:bg-violet-500 transition px-4 py-2 rounded-lg text-sm font-semibold">
          + Nueva reunión
        </button>
      </div>

      <!-- Form nueva reunión (oculto) -->
      <div id="new-meeting-form" class="hidden card max-w-lg">
        <h2 class="font-semibold text-sm mb-4">Nueva reunión</h2>
        <div class="space-y-3">
          <div><label class="text-xs text-gray-400 mb-1 block">Lead ID</label>
            <input id="m-lead-id" placeholder="uuid del lead" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"></div>
          <div><label class="text-xs text-gray-400 mb-1 block">Fecha y hora</label>
            <input id="m-date" type="datetime-local" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"></div>
          <div><label class="text-xs text-gray-400 mb-1 block">Tipo</label>
            <select id="m-type" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
              <option value="discovery">Discovery</option>
              <option value="follow_up">Follow-up</option>
              <option value="closing">Cierre</option>
              <option value="onboarding">Onboarding</option>
            </select></div>
          <div><label class="text-xs text-gray-400 mb-1 block">Notas</label>
            <textarea id="m-notes" rows="2" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"></textarea></div>
          <div class="flex gap-2">
            <button onclick="saveMeeting()" class="flex-1 bg-violet-600 hover:bg-violet-500 transition rounded-lg py-2 text-sm font-semibold">Guardar</button>
            <button onclick="document.getElementById('new-meeting-form').classList.add('hidden')" class="px-4 bg-gray-800 hover:bg-gray-700 transition rounded-lg py-2 text-sm">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Lista de reuniones -->
      <div id="meetings-list" class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="flex items-center justify-center h-24 text-gray-500">Cargando...</div>
      </div>
    </div>`;

  await loadMeetings();
}

function openNewMeetingForm() {
  document.getElementById('new-meeting-form').classList.toggle('hidden');
}

async function saveMeeting() {
  const body = {
    lead_id: document.getElementById('m-lead-id').value,
    scheduled_at: document.getElementById('m-date').value,
    type: document.getElementById('m-type').value,
    notes: document.getElementById('m-notes').value,
  };
  if (!body.lead_id || !body.scheduled_at) return showToast('Lead ID y fecha son requeridos', 'error');

  const res = await api('/api/meetings', { method: 'POST', body });
  if (res?.ok) {
    showToast('Reunión guardada');
    document.getElementById('new-meeting-form').classList.add('hidden');
    await loadMeetings();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function loadMeetings() {
  const res = await api('/api/meetings/all');
  const meetings = res?.meetings || [];
  const wrap = document.getElementById('meetings-list');
  if (!wrap) return;

  if (!meetings.length) {
    wrap.innerHTML = '<div class="text-center py-12 text-gray-500">Sin reuniones programadas</div>';
    return;
  }

  const typeLabel = { discovery: 'Discovery', follow_up: 'Follow-up', closing: 'Cierre', onboarding: 'Onboarding' };
  const statusColors2 = { scheduled: 'text-violet-400', completed: 'text-green-400', no_show: 'text-red-400', cancelled: 'text-gray-500' };

  wrap.innerHTML = `<table class="w-full text-sm">
    <thead><tr class="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
      <th class="text-left px-4 py-3">Lead</th>
      <th class="text-left px-4 py-3">Fecha</th>
      <th class="text-left px-4 py-3">Tipo</th>
      <th class="text-left px-4 py-3">Estado</th>
      <th class="text-left px-4 py-3">Notas</th>
      <th class="px-4 py-3"></th>
    </tr></thead>
    <tbody>
      ${meetings.map(m => `<tr class="border-t border-gray-800/60">
        <td class="px-4 py-3">
          <p class="font-medium">${m.leads?.name || 'Sin nombre'}</p>
          <p class="text-gray-500 text-xs">${m.leads?.email || m.leads?.contact || ''}</p>
        </td>
        <td class="px-4 py-3 text-gray-300">${fmtDate(m.scheduled_at)}</td>
        <td class="px-4 py-3 text-gray-400">${typeLabel[m.type] || m.type}</td>
        <td class="px-4 py-3 ${statusColors2[m.status] || 'text-gray-400'} font-medium">${m.status}</td>
        <td class="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">${m.notes || '—'}</td>
        <td class="px-4 py-3">
          <select onchange="updateMeetingStatus('${m.id}', this.value)"
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none">
            <option value="">Cambiar...</option>
            <option value="completed">Completada</option>
            <option value="no_show">No show</option>
            <option value="cancelled">Cancelar</option>
          </select>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function updateMeetingStatus(id, status) {
  if (!status) return;
  const res = await api(`/api/meetings/${id}/status`, { method: 'PATCH', body: { status } });
  if (res?.ok) { showToast('Estado actualizado'); await loadMeetings(); }
  else showToast(res?.error || 'Error', 'error');
}
