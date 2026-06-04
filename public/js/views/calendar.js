async function renderCalendar(root) {
  root.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-white flex items-center gap-3">
            <svg class="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Calendario
          </h1>
          <p class="text-gray-500 text-[13px] mt-1">Reuniones y seguimientos</p>
        </div>
        <button onclick="openNewMeetingForm()"
          class="bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2.5 rounded-lg text-[13px] font-semibold flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nueva reunion
        </button>
      </div>

      <!-- Form nueva reunion (oculto) -->
      <div id="new-meeting-form" class="hidden card max-w-lg">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-semibold text-[13px] text-white flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
            Nueva reunion
          </h2>
          <button onclick="document.getElementById('new-meeting-form').classList.add('hidden')" class="text-gray-500 hover:text-gray-300 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="space-y-4">
          <div><label class="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block font-medium">Lead ID</label>
            <input id="m-lead-id" placeholder="uuid del lead" class="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-500 focus:border-violet-500 transition-colors"></div>
          <div><label class="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block font-medium">Fecha y hora</label>
            <input id="m-date" type="datetime-local" class="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 focus:border-violet-500 transition-colors"></div>
          <div class="flex gap-3">
            <div class="flex-1"><label class="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block font-medium">Tipo</label>
              <select id="m-type" class="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 focus:border-violet-500 cursor-pointer transition-colors">
                <option value="discovery">Discovery</option>
                <option value="follow_up">Follow-up</option>
                <option value="closing">Cierre</option>
                <option value="onboarding">Onboarding</option>
              </select></div>
            <div class="w-28"><label class="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block font-medium">Duracion</label>
              <input id="m-duration" type="number" value="30" min="15" max="180" step="15"
                class="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 focus:border-violet-500 transition-colors"></div>
          </div>
          <div><label class="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block font-medium">Notas</label>
            <textarea id="m-notes" rows="2" placeholder="Notas de la reunion..." class="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-500 focus:border-violet-500 transition-colors"></textarea></div>
          <p id="m-calendar-hint" class="text-[11px] text-violet-400 hidden flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Se creara automaticamente un evento en Google Calendar con Meet.
          </p>
          <div class="flex gap-2 pt-2">
            <button onclick="saveMeeting()" class="flex-1 bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg py-2.5 text-[13px] font-semibold">Guardar</button>
            <button onclick="document.getElementById('new-meeting-form').classList.add('hidden')" class="px-4 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg py-2.5 text-[13px] text-gray-300">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Lista de reuniones -->
      <div id="meetings-list" class="bg-gray-900/80 border border-gray-800/80 rounded-xl overflow-hidden">
        <div class="flex items-center justify-center h-24 text-gray-500 text-[13px]">
          <svg class="w-4 h-4 spinning mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Cargando...
        </div>
      </div>
    </div>`;

  await loadMeetings();

  // Hint de Google Calendar si esta configurado
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
    showToast('Reunion guardada' + (res.meeting?.meet_url ? ' con Google Meet' : ''));
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
    wrap.innerHTML = `<div class="text-center py-16 text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      <p class="text-[13px]">Sin reuniones programadas</p>
      <button onclick="openNewMeetingForm()" class="mt-3 text-[12px] text-violet-400 hover:text-violet-300 transition-colors">Agendar primera reunion</button>
    </div>`;
    return;
  }

  const typeLabel = { discovery: 'Discovery', follow_up: 'Follow-up', closing: 'Cierre', onboarding: 'Onboarding' };
  const typeColors = {
    discovery: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    follow_up: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    closing: 'bg-green-500/15 text-green-400 border border-green-500/30',
    onboarding: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  };
  const statusStyles = { 
    scheduled: 'bg-violet-500/15 text-violet-400 border border-violet-500/30', 
    completed: 'bg-green-500/15 text-green-400 border border-green-500/30', 
    no_show: 'bg-red-500/15 text-red-400 border border-red-500/30', 
    cancelled: 'bg-gray-500/15 text-gray-500 border border-gray-500/30' 
  };

  const hasMeet = meetings.some(m => m.calendar_link);

  wrap.innerHTML = `<table class="w-full text-[13px]">
    <thead><tr class="border-b border-gray-800/80 text-gray-500 text-[11px] uppercase tracking-wider">
      <th class="text-left px-4 py-3 font-medium">Lead</th>
      <th class="text-left px-4 py-3 font-medium">Fecha</th>
      <th class="text-left px-4 py-3 font-medium">Tipo</th>
      <th class="text-left px-4 py-3 font-medium">Estado</th>
      <th class="text-left px-4 py-3 font-medium">Notas</th>
      ${hasMeet ? '<th class="text-left px-4 py-3 font-medium">Meet</th>' : ''}
      <th class="px-4 py-3"></th>
    </tr></thead>
    <tbody>
      ${meetings.map(m => `<tr class="border-t border-gray-800/50 hover:bg-gray-800/30 transition-colors">
        <td class="px-4 py-3">
          <p class="font-medium text-gray-100">${m.leads?.name || 'Sin nombre'}</p>
          <p class="text-gray-500 text-[11px]">${m.leads?.email || m.leads?.contact || ''}</p>
        </td>
        <td class="px-4 py-3 text-gray-300 text-[13px] tabular-nums">${fmtDate(m.scheduled_at)}</td>
        <td class="px-4 py-3">
          <span class="badge ${typeColors[m.type] || 'bg-gray-500/15 text-gray-400 border border-gray-500/30'} text-[10px]">${typeLabel[m.type] || m.type}</span>
        </td>
        <td class="px-4 py-3">
          <span class="badge ${statusStyles[m.status] || 'bg-gray-500/15 text-gray-400 border border-gray-500/30'} text-[10px] uppercase font-medium">${m.status}</span>
        </td>
        <td class="px-4 py-3 text-gray-500 text-[11px] max-w-xs truncate">${m.notes || '-'}</td>
        ${hasMeet ? `<td class="px-4 py-3">
          ${m.calendar_link
            ? `<a href="${m.calendar_link}" target="_blank"
                class="inline-flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 px-2 py-1 rounded-md">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Meet</a>`
            : '<span class="text-gray-700 text-[11px]">-</span>'}
        </td>` : ''}
        <td class="px-4 py-3">
          <select onchange="updateMeetingStatus('${m.id}', this.value)"
            class="bg-gray-800/60 border border-gray-700/60 rounded-lg px-2 py-1.5 text-[11px] text-gray-400 cursor-pointer hover:bg-gray-800 transition-colors">
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
