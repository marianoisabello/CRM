async function renderCalendar(root) {
  root.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="display text-3xl" style="color:var(--foreground);">Calendario</h1>
          <p class="text-sm mt-0.5" style="color:var(--muted-foreground);">Reuniones y seguimientos</p>
        </div>
        <button onclick="openNewMeetingForm()" class="btn-primary flex items-center gap-1.5 text-xs">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nueva reunión
        </button>
      </div>

      <!-- Form nueva reunión (oculto) -->
      <div id="new-meeting-form" class="hidden card max-w-lg">
        <h2 class="font-semibold text-sm mb-4" style="color:var(--foreground);">Nueva reunión</h2>
        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:var(--muted-foreground);">Lead ID</label>
            <input id="m-lead-id" placeholder="uuid del lead" class="input">
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:var(--muted-foreground);">Fecha y hora</label>
            <input id="m-date" type="datetime-local" class="input">
          </div>
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:var(--muted-foreground);">Tipo</label>
              <select id="m-type" class="input">
                <option value="discovery">Discovery</option>
                <option value="follow_up">Follow-up</option>
                <option value="closing">Cierre</option>
                <option value="onboarding">Onboarding</option>
              </select>
            </div>
            <div class="w-32">
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:var(--muted-foreground);">Duración (min)</label>
              <input id="m-duration" type="number" value="30" min="15" max="180" step="15" class="input">
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:var(--muted-foreground);">Notas</label>
            <textarea id="m-notes" rows="2" class="input" style="resize:vertical;"></textarea>
          </div>
          <p id="m-calendar-hint" class="text-xs hidden" style="color:var(--primary);">Se creará automáticamente un evento en Google Calendar con Meet.</p>
          <div class="flex gap-2">
            <button onclick="saveMeeting()" class="flex-1 btn-primary text-sm py-2">Guardar</button>
            <button onclick="document.getElementById('new-meeting-form').classList.add('hidden')" class="btn-ghost px-4 text-sm py-2">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Lista de reuniones -->
      <div id="meetings-list" class="table-shell" style="border-color:var(--border);border-radius:8px;">
        <div class="flex items-center justify-center h-24 text-sm" style="color:var(--muted-foreground);">Cargando...</div>
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
    wrap.innerHTML = '<div class="text-center py-12 text-sm" style="color:var(--muted-foreground);">Sin reuniones programadas</div>';
    return;
  }

  const typeLabel = { discovery: 'Discovery', follow_up: 'Follow-up', closing: 'Cierre', onboarding: 'Onboarding' };
  const meetingStatusBadge = {
    scheduled:  'badge-info',
    completed:  'badge-success',
    no_show:    'badge-danger',
    cancelled:  'badge-neutral',
  };

  const hasMeet = meetings.some(m => m.calendar_link);

  wrap.innerHTML = `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid var(--border);">
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
      ${meetings.map(m => `<tr class="data-row transition" style="border-top:1px solid var(--secondary);">
        <td class="px-4 py-3">
          <p class="font-medium" style="color:var(--foreground);">${m.leads?.name || 'Sin nombre'}</p>
          <p class="text-xs" style="color:var(--muted-foreground);">${m.leads?.email || m.leads?.contact || ''}</p>
        </td>
        <td class="px-4 py-3 font-data text-xs" style="color:var(--foreground);">${fmtDate(m.scheduled_at)}</td>
        <td class="px-4 py-3 text-xs" style="color:var(--muted-foreground);">${typeLabel[m.type] || m.type}</td>
        <td class="px-4 py-3"><span class="badge ${meetingStatusBadge[m.status] || 'badge-neutral'}">${m.status}</span></td>
        <td class="px-4 py-3 text-xs max-w-xs truncate" style="color:var(--muted-foreground);">${m.notes || '—'}</td>
        ${hasMeet ? `<td class="px-4 py-3">
          ${m.calendar_link
            ? `<a href="${m.calendar_link}" target="_blank"
                class="inline-flex items-center gap-1 text-xs transition" style="color:var(--primary);">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Meet</a>`
            : '<span class="text-xs" style="color:var(--border);">—</span>'}
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
