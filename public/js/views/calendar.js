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
          <div class="flex gap-3">
            <div class="flex-1"><label class="text-xs text-gray-400 mb-1 block">Tipo</label>
              <select id="m-type" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
                <option value="discovery">Discovery</option>
                <option value="follow_up">Follow-up</option>
                <option value="closing">Cierre</option>
                <option value="onboarding">Onboarding</option>
              </select></div>
            <div class="w-28"><label class="text-xs text-gray-400 mb-1 block">Duración (min)</label>
              <input id="m-duration" type="number" value="30" min="15" max="180" step="15"
                class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"></div>
          </div>
          <div><label class="text-xs text-gray-400 mb-1 block">Notas</label>
            <textarea id="m-notes" rows="2" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"></textarea></div>
          <p id="m-calendar-hint" class="text-xs text-violet-400 hidden">Se creará automáticamente un evento en Google Calendar con Meet.</p>
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

  // Hint de Google Calendar si está configurado
  api('/api/settings/integrations').then(res => {
    if (res?.calendar) {
      document.getElementById('m-calendar-hint')?.classList.remove('hidden');
    }
  }).catch(() => {});
}

function openNewMeetingForm() {
  document.getElementById('new-meeting-form').classList.toggle('hidden');
}

async function saveMeeting() {
  const body = {
    lead_id: document.getElementById('m-lead-id').value.trim(),
    scheduled_at: document.getElementById('m-date').value,
    type: document.getElementById('m-type').value,
    notes: document.getElementById('m-notes').value,
    duration_minutes: parseInt(document.getElementById('m-duration').value) || 30,
  };
  if (!body.lead_id || !body.scheduled_at) return showToast('Lead ID y fecha son requeridos', 'error');

  const res = await api('/api/meetings', { method: 'POST', body });
  if (res?.ok) {
    const meetMsg = res.meeting?.meet_url
      ? ` · <a href="${res.meeting.meet_url}" target="_blank" class="underline text-violet-300">Abrir Meet</a>`
      : '';
    showToast('Reunión guardada' + (res.meeting?.meet_url ? ' con Google Meet' : ''));
    document.getElementById('new-meeting-form').classList.add('hidden');
    if (res.meeting?.meet_url) {
      window.open(res.meeting.meet_url, '_blank');
    }
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

  const hasMeet = meetings.some(m => m.calendar_link);

  wrap.innerHTML = `<table class="w-full text-sm">
    <thead><tr class="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
      <th class="text-left px-4 py-3">Lead</th>
      <th class="text-left px-4 py-3">Fecha</th>
      <th class="text-left px-4 py-3">Tipo</th>
      <th class="text-left px-4 py-3">Estado</th>
      <th class="text-left px-4 py-3">Notas</th>
      ${hasMeet ? '<th class="text-left px-4 py-3">Meet</th>' : ''}
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
        ${hasMeet ? `<td class="px-4 py-3">
          ${m.calendar_link
            ? `<a href="${m.calendar_link}" target="_blank"
                class="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Meet</a>`
            : '<span class="text-gray-700 text-xs">—</span>'}
        </td>` : ''}
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
