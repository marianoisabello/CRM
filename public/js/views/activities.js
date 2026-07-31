'use strict';

let _activitiesTypeFilter = '';

async function renderActivities(root) {
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('CRM')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Actividades</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Timeline de notas, llamadas y agentes</p>
        </div>
        <div class="flex gap-2">
          <select id="activities-filter" onchange="_activitiesTypeFilter=this.value;renderActivities(document.getElementById('view-root'))"
            class="rounded-lg px-3 py-2 text-xs"
            style="background:var(--elevated);border:1px solid var(--border);color:var(--foreground);">
            <option value="">Todas</option>
            <option value="note">Notas</option>
            <option value="call">Llamadas</option>
            <option value="email">Emails</option>
            <option value="task">Tareas</option>
            <option value="agent">Agentes</option>
          </select>
          <button type="button" onclick="renderActivities(document.getElementById('view-root'))" class="btn-ghost text-xs">Actualizar</button>
        </div>
      </div>
      <div id="activities-feed"></div>
    </div>`;

  const filter = document.getElementById('activities-filter');
  if (filter) filter.value = _activitiesTypeFilter;
  const type = _activitiesTypeFilter;
  const feed = document.getElementById('activities-feed');
  feed.innerHTML = '<div class="skeleton h-48 rounded-xl"></div>';

  const res = await api(`/api/activities?limit=80${type ? `&type=${encodeURIComponent(type)}` : ''}`);
  const activities = res?.activities || [];
  if (!activities.length) {
    feed.innerHTML = emptyState({ headline: 'Sin actividades', body: 'Aparecen al mover deals, generar briefings o dejar notas.' });
    return;
  }

  const typeColor = {
    note: 'var(--info)', call: 'var(--success)', email: 'var(--warning)',
    task: '#a78bfa', agent: 'var(--primary)',
  };

  feed.innerHTML = `<div class="space-y-2">${activities.map((a) => `
    <div class="rounded-xl px-4 py-3 border" style="background:var(--card);border-color:var(--border);border-left:3px solid ${typeColor[a.type] || 'var(--border)'};">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="eyebrow" style="color:${typeColor[a.type] || 'var(--muted-foreground)'};">${_escHtml(a.type || 'note')}</span>
            ${a.agent_id ? `<span class="text-[10px] font-data" style="color:var(--muted-foreground);">${_escHtml(a.agent_id)}</span>` : ''}
          </div>
          <p class="text-sm font-medium" style="color:var(--foreground);">${_escHtml(a.title)}</p>
          ${a.body ? `<p class="text-xs mt-1 leading-relaxed" style="color:var(--muted-foreground);">${_escHtml(String(a.body).slice(0, 220))}</p>` : ''}
        </div>
        <span class="font-data text-[10px] shrink-0" style="color:var(--muted-foreground);">${fmtDate(a.occurred_at)}</span>
      </div>
    </div>`).join('')}</div>`;
  hydrateMotion(feed);
}
