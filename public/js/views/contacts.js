'use strict';

// Contactos = leads en estado «Ganado» (leads.status = 'won').
// Lista: GET /api/crm/contacts-won · Ficha: GET /api/crm/contacts-won/:leadId/timeline

let _contactsRows = [];

async function renderContacts(root, leadId = null) {
  if (leadId) return renderContactDetail(root, leadId);

  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('Clientes ganados')}
          <h1 class="display text-4xl md:text-5xl mt-2" style="color:var(--foreground);">Contactos</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Clientes ganados · <span id="contacts-count">…</span></p>
        </div>
        <div class="flex gap-2 no-print">
          <button type="button" onclick="_exportContactsCsv()" class="btn-ghost text-xs">Exportar CSV</button>
          <button type="button" onclick="renderContacts(document.getElementById('view-root'))" class="btn-ghost text-xs">Actualizar</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <input id="contacts-q" type="search" placeholder="Buscar nombre, email o empresa…" class="input" style="max-width:340px;"
          oninput="clearTimeout(window._contactsQT);window._contactsQT=setTimeout(_renderContactsTable,180)">
        <select id="contacts-stage" class="input" style="width:auto;min-width:190px;" onchange="_renderContactsTable()">
          <option value="">Etapa: todas</option>
          ${Object.entries(dealStageLabel).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          <option value="sin_deal">Sin oportunidad</option>
        </select>
        <select id="contacts-source" class="input" style="width:auto;min-width:170px;" onchange="_renderContactsTable()">
          <option value="">Fuente: todas</option>
          ${Object.entries(sourceLabel).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          <option value="chatbot">🤖 Chatbox</option>
        </select>
      </div>
      <div id="contacts-banner"></div>
      <div id="contacts-table"><div class="skeleton h-40 rounded-xl"></div></div>
    </div>`;

  const res = await api('/api/crm/contacts-won');
  if (!res?.ok) {
    document.getElementById('contacts-table').innerHTML = emptyState({ headline: 'Error cargando contactos', body: res?.error || '' });
    return;
  }
  _contactsRows = res.contacts || [];
  const missing = _contactsRows.filter((c) => !c.converted_contact_id).length;
  const banner = document.getElementById('contacts-banner');
  if (banner && missing) {
    banner.innerHTML = `<div class="rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3" style="background:var(--info-soft);border:1px solid rgb(106 166 255 / 0.3);">
      <p class="text-xs" style="color:var(--foreground);"><b>${missing}</b> ${missing === 1 ? 'cliente ganado no tiene' : 'clientes ganados no tienen'} todavía ficha CRM (contacto + empresa + oportunidad). Se crean con el mismo mecanismo que al pasar un lead a Ganado.</p>
      <button type="button" class="btn-ghost text-xs" onclick="_syncWonContacts(${missing})">Crear fichas</button>
    </div>`;
  }
  _renderContactsTable();
}

function _filteredContacts() {
  const q = (document.getElementById('contacts-q')?.value || '').trim().toLowerCase();
  const stage = document.getElementById('contacts-stage')?.value || '';
  const source = document.getElementById('contacts-source')?.value || '';
  return _contactsRows.filter((c) => {
    if (stage && (c.deal?.stage || 'sin_deal') !== stage) return false;
    if (source && c.source !== source) return false;
    if (q) {
      const hay = `${c.name || ''} ${c.email || ''} ${c.company?.name || ''} ${c.company_name || ''} ${c.perfil?.empresa || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function _contactCompanyName(c) {
  return c.company?.name || c.company_name || c.perfil?.empresa || null;
}

function _stageBadge(stage) {
  if (!stage) return '<span class="badge badge-neutral">Sin oportunidad</span>';
  const col = dealStageColors[stage] || { color: 'var(--muted-foreground)', soft: 'var(--secondary)' };
  return `<span class="badge" style="background:${col.soft};color:${col.color};border:1px solid var(--border);">${_escHtml(dealStageLabel[stage] || stage)}</span>`;
}

function _renderContactsTable() {
  const el = document.getElementById('contacts-table');
  if (!el) return;
  const rows = _filteredContacts();
  const countEl = document.getElementById('contacts-count');
  if (countEl) countEl.innerHTML = `<span class="font-data" style="color:var(--primary);">${rows.length}</span> de ${_contactsRows.length}`;

  if (!_contactsRows.length) {
    el.innerHTML = emptyState({
      headline: 'Todavía no hay clientes ganados',
      body: 'Cuando un lead pasa a «Ganado» (desde Leads o el Pipeline) aparece acá como contacto.',
      actionLabel: 'Ir a Pipeline leads',
      actionOnclick: "navigate('pipeline')",
    });
    return;
  }
  if (!rows.length) {
    el.innerHTML = emptyState({ headline: 'Sin resultados', body: 'Probá con otra búsqueda o filtro.' });
    return;
  }

  el.innerHTML = `
    <div class="table-shell table-scroll">
      <table class="w-full text-sm" style="min-width:760px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th class="text-left px-4 py-3">Contacto</th>
            <th class="text-left px-4 py-3">Empresa</th>
            <th class="text-left px-4 py-3">Etapa</th>
            <th class="text-right px-4 py-3">Importe</th>
            <th class="text-left px-4 py-3">Última actividad</th>
            <th class="text-left px-4 py-3">Responsable</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((c, i) => `
            <tr class="lead-row stagger-row" style="border-top:1px solid var(--border);animation-delay:${Math.min(i, 14) * 0.028}s;" onclick="navigate('contacts/${c.id}')">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5">
                  ${avatarHtml(c.name || c.email || '?', { size: 30 })}
                  <div class="min-w-0">
                    <p class="font-medium leading-tight truncate" style="color:var(--foreground);">${_escHtml(c.name || 'Sin nombre')}</p>
                    <p class="text-xs mt-0.5 truncate max-w-[220px]" style="color:var(--muted-foreground);">${_escHtml(c.deal?.title || c.email || c.contact || '')}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3" style="color:var(--foreground);">${_escHtml(_contactCompanyName(c) || '—')}</td>
              <td class="px-4 py-3">${_stageBadge(c.deal?.stage)}</td>
              <td class="px-4 py-3 text-right font-data tnum" style="color:var(--foreground);">${c.deal ? fmtMoney(c.deal.value, c.deal.currency) : '—'}</td>
              <td class="px-4 py-3 text-xs" style="color:var(--muted-foreground);" title="${_escHtml(c.last_activity_title || '')}">${fmtRelative(c.last_activity_at)}</td>
              <td class="px-4 py-3">${c.owner ? `<div class="flex items-center gap-2">${avatarHtml(c.owner.name, { size: 22 })}<span class="text-xs" style="color:var(--muted-foreground);">${_escHtml(c.owner.name)}</span></div>` : '<span class="text-xs" style="color:var(--muted-foreground);">—</span>'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  hydrateMotion(el);
}

function _exportContactsCsv() {
  downloadCsv(`contactos-ganados-${new Date().toISOString().slice(0, 10)}.csv`, _filteredContacts(), [
    { label: 'Nombre', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Contacto', key: 'contact' },
    { label: 'Empresa', get: (c) => _contactCompanyName(c) },
    { label: 'Fuente', key: 'source' },
    { label: 'Score', key: 'score' },
    { label: 'Etapa', get: (c) => c.deal ? dealStageLabel[c.deal.stage] || c.deal.stage : 'Sin oportunidad' },
    { label: 'Importe', get: (c) => c.deal?.value ?? '' },
    { label: 'Moneda', get: (c) => c.deal?.currency ?? '' },
    { label: 'Responsable', get: (c) => c.owner?.name || '' },
    { label: 'Última actividad', key: 'last_activity_at' },
  ]);
}

async function _syncWonContacts(n) {
  if (!confirm(`Crear ficha CRM (contacto, empresa si tiene, oportunidad ganada y cliente) para ${n} lead(s) ganados?`)) return;
  showToast('Creando fichas…');
  const res = await api('/api/crm/sync-won', { method: 'POST', body: {} });
  if (res?.ok) {
    const fails = (res.results || []).filter((r) => !r.ok).length;
    showToast(fails ? `${res.processed - fails} creadas · ${fails} con error` : `${res.processed} fichas creadas`, fails ? 'error' : 'success');
    renderContacts(document.getElementById('view-root'));
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

// ─── Ficha de contacto + línea de tiempo ─────────────────────────────────────

const _tlIcon = {
  lead: '✦', won: '🏆', note: '✎', call: '☎', email: '✉', task: '☐', agent: '⚙', calendar: '📅',
  bot: '🤖', doc: '📝', mic: '🎙', inbox: '📥', user: '✦', trophy: '🏆',
};
const _tlColor = {
  lead: 'var(--info)', won: 'var(--primary)', activity: 'var(--foreground)', agent: 'var(--accent)', meeting: 'var(--warning)',
  agent_run: 'var(--accent)', briefing: '#a78bfa', reunion: 'var(--warning)', task: 'var(--info)', decision: 'var(--success)',
};

async function renderContactDetail(root, leadId) {
  root.innerHTML = `<div class="space-y-4"><div class="skeleton h-28 rounded-xl"></div><div class="skeleton h-64 rounded-xl"></div></div>`;
  const res = await api(`/api/crm/contacts-won/${encodeURIComponent(leadId)}/timeline`);
  if (!res?.ok) {
    root.innerHTML = emptyState({ headline: 'Contacto no encontrado', body: res?.error || '', actionLabel: '← Volver a Contactos', actionOnclick: "navigate('contacts')" });
    return;
  }
  const c = res.contact || {};
  window._currentContact = c;
  const company = _contactCompanyName(c);
  const events = res.events || [];

  const info = [
    ['Email', c.email ? `<a href="mailto:${_escHtml(c.email)}" style="color:var(--primary);">${_escHtml(c.email)}</a>` : '—'],
    ['Teléfono / contacto', _escHtml(c.contact?.phone || c.contact || '—')],
    ['Empresa', _escHtml(company || '—')],
    ['Cargo / rubro', _escHtml([c.perfil?.cargo, c.perfil?.rubro].filter(Boolean).join(' · ') || c.contact?.role || '—')],
    ['Fuente', sourceLabel[c.source] || _escHtml(c.source || '—')],
    ['Ciudad', _escHtml(c.perfil?.ciudad || c.company?.city || '—')],
    ['Score SDR', scoreBar(c.score)],
    ['Responsable', c.owner ? _escHtml(c.owner.name) : '—'],
  ];

  root.innerHTML = `
    <div class="space-y-5 anim-fade-up">
      <a href="#contacts" class="text-xs no-print" style="color:var(--muted-foreground);">← Contactos</a>
      <section class="aura relative overflow-hidden rounded-xl border px-5 py-6 md:px-7" style="border-color:var(--border);">
        <div class="relative flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            ${avatarHtml(c.name || c.email || '?', { size: 56 })}
            <div class="min-w-0">
              ${eyebrow('Cliente ganado')}
              <h1 class="display text-3xl md:text-4xl truncate" style="color:var(--foreground);">${_escHtml(c.name || 'Sin nombre')}</h1>
              <div class="flex flex-wrap items-center gap-2 mt-1.5">
                ${statusBadge(c.status)} ${classificationBadge(c.classification)}
                ${company ? `<span class="text-sm" style="color:var(--muted-foreground);">${_escHtml(company)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 no-print">
            <button type="button" class="btn-ghost text-xs" onclick='openLeadModal(${JSON.stringify(c).replace(/'/g, '&#39;')})'>Ver lead</button>
            <button type="button" class="btn-ghost text-xs" onclick="_contactTaskForm()">+ Tarea</button>
            <button type="button" class="btn-primary text-xs" onclick="document.getElementById('ct-note').focus()">+ Nota</button>
          </div>
        </div>
      </section>

      <div class="grid lg:grid-cols-3 gap-5">
        <div class="space-y-4 lg:col-span-1">
          <div class="card">
            <p class="eyebrow mb-3">Datos</p>
            <dl class="space-y-2.5 text-sm">
              ${info.map(([k, v]) => `<div class="flex justify-between gap-3"><dt style="color:var(--muted-foreground);">${k}</dt><dd class="text-right min-w-0 truncate" style="color:var(--foreground);">${v}</dd></div>`).join('')}
            </dl>
          </div>
          <div class="card">
            <p class="eyebrow mb-3">Oportunidad</p>
            ${c.deal ? `
              <button type="button" class="w-full text-left" onclick="openDealDrawer('${c.deal.id}')">
                <p class="text-sm font-medium" style="color:var(--foreground);">${_escHtml(c.deal.title)}</p>
                <div class="flex items-center justify-between mt-2">
                  ${_stageBadge(c.deal.stage)}
                  <span class="font-data" style="color:var(--primary);">${fmtMoney(c.deal.value, c.deal.currency)}</span>
                </div>
                ${c.deals_count > 1 ? `<p class="text-xs mt-2" style="color:var(--muted-foreground);">+${c.deals_count - 1} oportunidad(es) más</p>` : ''}
              </button>` : `<p class="text-sm" style="color:var(--muted-foreground);">Sin oportunidad vinculada.</p>`}
          </div>
          ${c.perfil?.oferta_estimada || c.sdr_notes ? `
          <div class="card">
            <p class="eyebrow mb-2">Contexto de agentes</p>
            ${c.perfil?.oferta_estimada ? `<p class="text-xs mb-2" style="color:var(--foreground);"><span style="color:var(--muted-foreground);">Oferta estimada:</span> ${_escHtml(c.perfil.oferta_estimada)}</p>` : ''}
            ${c.sdr_notes ? `<p class="text-xs leading-relaxed whitespace-pre-wrap" style="color:var(--muted-foreground);">${_escHtml(c.sdr_notes)}</p>` : ''}
          </div>` : ''}
        </div>

        <div class="card lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <p class="eyebrow">Línea de tiempo</p>
            <span class="font-data text-xs" style="color:var(--muted-foreground);">${events.length} eventos</span>
          </div>
          <div class="flex gap-2 mb-5 no-print">
            <input id="ct-note" class="input" placeholder="Escribí una nota y Enter…" onkeydown="if(event.key==='Enter')_addContactNote()">
            <button type="button" class="btn-ghost text-xs shrink-0" onclick="_addContactNote()">Guardar</button>
          </div>
          ${events.length ? `<div class="timeline">${events.map((e, i) => `
            <div class="timeline-item stagger-row" style="animation-delay:${Math.min(i, 14) * 0.03}s;">
              <span class="timeline-dot" style="color:${_tlColor[e.kind] || 'var(--muted-foreground)'};">${_tlIcon[e.icon] || '•'}</span>
              <div class="flex flex-wrap items-baseline justify-between gap-x-3">
                <p class="text-sm font-medium" style="color:var(--foreground);">${e.href ? `<a href="${e.href}" style="color:inherit;">${_escHtml(e.title)}</a>` : _escHtml(e.title)}</p>
                <span class="font-data text-[11px]" style="color:var(--muted-foreground);" title="${_escHtml(fmtDate(e.ts))}">${e.ts ? fmtRelative(e.ts) : 'sin fecha'}</span>
              </div>
              ${e.by || e.meta ? `<p class="text-[11px] mt-0.5" style="color:var(--muted-foreground);">${_escHtml([e.by, e.meta].filter(Boolean).join(' · '))}</p>` : ''}
              ${e.body ? `<p class="text-xs mt-1 leading-relaxed" style="color:var(--muted-foreground);">${_escHtml(String(e.body).slice(0, 280))}${String(e.body).length > 280 ? '…' : ''}</p>` : ''}
              ${e.link ? `<a href="${_escHtml(e.link)}" target="_blank" rel="noopener" class="text-xs" style="color:var(--primary);">Abrir enlace</a>` : ''}
            </div>`).join('')}</div>` : emptyState({ headline: 'Sin eventos', body: 'Las notas, reuniones y acciones de agentes van a aparecer acá.' })}
        </div>
      </div>
    </div>`;
}

async function _addContactNote() {
  const c = window._currentContact;
  const input = document.getElementById('ct-note');
  const title = (input?.value || '').trim();
  if (!c || !title) return;
  const res = await api('/api/activities', {
    method: 'POST',
    body: { type: 'note', title, lead_id: c.id, contact_id: c.converted_contact_id || null, deal_id: c.deal?.id || null, company_id: c.company?.id || c.company_id || null },
  });
  if (res?.ok) {
    showToast('Nota guardada');
    renderContactDetail(document.getElementById('view-root'), c.id);
  } else {
    showToast(res?.error || 'Error guardando nota', 'error');
  }
}

function _contactTaskForm() {
  const c = window._currentContact;
  if (!c) return;
  openTaskForm({ lead_id: c.id, deal_id: c.deal?.id || null, contact_id: c.converted_contact_id || null, title: `Seguimiento · ${c.name || ''}`.trim() }, () =>
    renderContactDetail(document.getElementById('view-root'), c.id)
  );
}
