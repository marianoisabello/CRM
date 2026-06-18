async function renderCalendar(root) {
  root.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold" style="color:#111827;">Calendario</h1>
          <p class="text-sm mt-0.5" style="color:#6B7280;">Reuniones y seguimientos</p>
        </div>
        <button onclick="openNewMeetingForm()" class="btn-primary flex items-center gap-1.5 text-xs">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nueva reunión
        </button>
      </div>

      <!-- Form nueva reunión (oculto) -->
      <div id="new-meeting-form" class="hidden card max-w-lg">
        <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Nueva reunión</h2>
        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Lead ID</label>
            <input id="m-lead-id" placeholder="uuid del lead" class="input">
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Fecha y hora</label>
            <input id="m-date" type="datetime-local" class="input">
          </div>
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Tipo</label>
              <select id="m-type" class="input">
                <option value="discovery">Discovery</option>
                <option value="follow_up">Follow-up</option>
                <option value="closing">Cierre</option>
                <option value="onboarding">Onboarding</option>
              </select>
            </div>
            <div class="w-32">
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Duración (min)</label>
              <input id="m-duration" type="number" value="30" min="15" max="180" step="15" class="input">
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Notas</label>
            <textarea id="m-notes" rows="2" class="input" style="resize:vertical;"></textarea>
          </div>
          <p id="m-calendar-hint" class="text-xs hidden" style="color:#2563EB;">Se creará automáticamente un evento en Google Calendar con Meet.</p>
          <div class="flex gap-2">
            <button onclick="saveMeeting()" class="flex-1 btn-primary text-sm py-2">Guardar</button>
            <button onclick="document.getElementById('new-meeting-form').classList.add('hidden')" class="btn-ghost px-4 text-sm py-2">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Lista de reuniones -->
      <div id="meetings-list" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
        <div class="flex items-center justify-center h-24 text-sm" style="color:#9CA3AF;">Cargando...</div>
      </div>
    </div>`;

  await loadMeetings();

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
    showToast('Reunión guardada' + (res.meeting?.meet_url ? ' con Google Meet' : ''));
    document.getElementById('new-meeting-form').classList.add('hidden');
    if (res.meeting?.meet_url) window.open(res.meeting.meet_url, '_blank');
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
    wrap.innerHTML = '<div class="text-center py-12 text-sm" style="color:#9CA3AF;">Sin reuniones programadas</div>';
    return;
  }

  const typeLabel = { discovery: 'Discovery', follow_up: 'Follow-up', closing: 'Cierre', onboarding: 'Onboarding' };
  const meetingStatusBadge = {
    scheduled:  'bg-blue-100 text-blue-700 border border-blue-200',
    completed:  'bg-green-100 text-green-700 border border-green-200',
    no_show:    'bg-red-100 text-red-700 border border-red-200',
    cancelled:  'bg-gray-100 text-gray-500 border border-gray-200',
  };

  const hasMeet = meetings.some(m => m.calendar_link);

  wrap.innerHTML = `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Lead</th>
        <th class="text-left px-4 py-3">Fecha</th>
        <th class="text-left px-4 py-3">Tipo</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Notas</th>
        ${hasMeet ? '<th class="text-left px-4 py-3">Meet</th>' : ''}
        <th class="px-4 py-3"></th>
      </tr>
    </thead>
    <tbody>
      ${meetings.map(m => `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;">
        <td class="px-4 py-3">
          <p class="font-medium" style="color:#111827;">${m.leads?.name || 'Sin nombre'}</p>
          <p class="text-xs" style="color:#9CA3AF;">${m.leads?.email || m.leads?.contact || ''}</p>
        </td>
        <td class="px-4 py-3 font-data text-xs" style="color:#374151;">${fmtDate(m.scheduled_at)}</td>
        <td class="px-4 py-3 text-xs" style="color:#6B7280;">${typeLabel[m.type] || m.type}</td>
        <td class="px-4 py-3"><span class="badge ${meetingStatusBadge[m.status] || 'bg-gray-100 text-gray-500'}">${m.status}</span></td>
        <td class="px-4 py-3 text-xs max-w-xs truncate" style="color:#6B7280;">${m.notes || '—'}</td>
        ${hasMeet ? `<td class="px-4 py-3">
          ${m.calendar_link
            ? `<a href="${m.calendar_link}" target="_blank"
                class="inline-flex items-center gap-1 text-xs transition" style="color:#2563EB;">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Meet</a>`
            : '<span class="text-xs" style="color:#D1D5DB;">—</span>'}
        </td>` : ''}
        <td class="px-4 py-3">
          <select onchange="updateMeetingStatus('${m.id}', this.value)"
            class="input text-xs" style="width:auto;padding:4px 8px;">
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
