'use strict';

// Empresas = solo contactos con empresa asignada (contacts.company_id), agrupados por empresa,
// con sus contactos y oportunidades. Fuente: GET /api/crm/companies-grouped

let _companyGroups = [];

async function renderCompanies(root) {
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('Herramientas')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Empresas</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Cuentas con contactos asignados · <span id="companies-count">…</span></p>
        </div>
        <div class="flex gap-2 no-print">
          <button type="button" onclick="_openCreateCompany()" class="btn-ghost text-xs">+ Empresa</button>
          <button type="button" onclick="renderCompanies(document.getElementById('view-root'))" class="btn-ghost text-xs">Actualizar</button>
        </div>
      </div>
      <input id="companies-q" type="search" placeholder="Buscar empresa o contacto…" class="input" style="max-width:340px;"
        oninput="clearTimeout(window._companiesQT);window._companiesQT=setTimeout(_renderCompanyGroups,180)" />
      <div id="companies-list">${'<div class="skeleton h-24 mb-3 rounded-xl"></div>'.repeat(3)}</div>
    </div>`;

  const res = await api('/api/crm/companies-grouped');
  if (!res?.ok) {
    document.getElementById('companies-list').innerHTML = emptyState({ headline: 'Error cargando empresas', body: res?.error || '' });
    return;
  }
  _companyGroups = res.groups || [];
  _renderCompanyGroups();
}

// Compat: llamadas viejas
async function _loadCompanies() { return renderCompanies(document.getElementById('view-root')); }

function _renderCompanyGroups() {
  const list = document.getElementById('companies-list');
  if (!list) return;
  const q = (document.getElementById('companies-q')?.value || '').trim().toLowerCase();
  const groups = q
    ? _companyGroups.filter((g) => `${g.company.name} ${g.company.industry || ''} ${g.contacts.map((c) => `${c.name || ''} ${c.email || ''}`).join(' ')}`.toLowerCase().includes(q))
    : _companyGroups;
  const countEl = document.getElementById('companies-count');
  if (countEl) countEl.innerHTML = `<span class="font-data" style="color:var(--primary);">${groups.length}</span> empresa${groups.length === 1 ? '' : 's'}`;

  if (!_companyGroups.length) {
    list.innerHTML = emptyState({
      headline: 'Ningún contacto tiene empresa todavía',
      body: 'Las empresas aparecen acá cuando un contacto queda vinculado a una (al calificar o ganar un lead con nombre de empresa). Los contactos sin empresa no se listan.',
      actionLabel: 'Ver contactos',
      actionOnclick: "navigate('contacts')",
    });
    return;
  }
  if (!groups.length) {
    list.innerHTML = emptyState({ headline: 'Sin resultados', body: 'Probá con otra búsqueda.' });
    return;
  }

  list.innerHTML = `<div class="grid md:grid-cols-2 gap-4">${groups.map((g, i) => {
    const co = g.company;
    const meta = [co.industry, co.city, co.website].filter(Boolean).join(' · ');
    return `<div class="card stagger-row" style="padding:16px;animation-delay:${Math.min(i, 12) * 0.04}s;">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          ${avatarHtml(co.name || '?', { size: 40 })}
          <div class="min-w-0">
            <p class="font-semibold truncate" style="color:var(--foreground);">${_escHtml(co.name)}</p>
            <p class="text-xs truncate" style="color:var(--muted-foreground);">${_escHtml(meta || '—')}</p>
          </div>
        </div>
        <button type="button" class="text-xs shrink-0" style="color:var(--primary);" onclick="openCompanyDetail('${co.id}')">Detalle</button>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-4">
        <div class="rounded-lg px-3 py-2" style="background:var(--elevated);"><p class="eyebrow" style="color:var(--muted-foreground);font-size:9px;">Contactos</p><p class="font-data text-lg" style="color:var(--foreground);">${g.contacts.length}</p></div>
        <div class="rounded-lg px-3 py-2" style="background:var(--elevated);"><p class="eyebrow" style="color:var(--muted-foreground);font-size:9px;">Pipeline</p><p class="font-data text-sm mt-1" style="color:var(--foreground);">${fmtMoney(g.pipeline_value, g.currency)}</p></div>
        <div class="rounded-lg px-3 py-2" style="background:var(--elevated);"><p class="eyebrow" style="color:var(--muted-foreground);font-size:9px;">Ganado</p><p class="font-data text-sm mt-1" style="color:var(--primary);">${fmtMoney(g.won_value, g.currency)}</p></div>
      </div>
      <p class="eyebrow mt-4 mb-1.5" style="color:var(--muted-foreground);">Contactos</p>
      ${g.contacts.slice(0, 6).map((c) => {
        const target = c.lead?.status === 'won' ? `navigate('contacts/${c.lead.id}')` : c.lead ? `navigate('leads')` : '';
        return `<div class="flex items-center justify-between gap-2 py-1.5 ${target ? 'cursor-pointer' : ''}" style="border-top:1px solid var(--border);" ${target ? `onclick="${target}"` : ''}>
          <div class="flex items-center gap-2 min-w-0">
            ${avatarHtml(c.name || c.email || '?', { size: 22 })}
            <span class="text-sm truncate" style="color:var(--foreground);">${_escHtml(c.name || c.email || '—')}</span>
            ${c.role ? `<span class="text-xs truncate" style="color:var(--muted-foreground);">· ${_escHtml(c.role)}</span>` : ''}
          </div>
          ${c.lead ? statusBadge(c.lead.status) : ''}
        </div>`;
      }).join('')}
      ${g.contacts.length > 6 ? `<p class="text-xs mt-1" style="color:var(--muted-foreground);">+${g.contacts.length - 6} más</p>` : ''}
      ${g.deals.length ? `
        <p class="eyebrow mt-4 mb-1.5" style="color:var(--muted-foreground);">Oportunidades</p>
        ${g.deals.slice(0, 5).map((d) => `
          <button type="button" class="w-full flex items-center justify-between gap-2 py-1.5 text-left" style="border-top:1px solid var(--border);" onclick="openDealDrawer('${d.id}')">
            <span class="text-sm truncate" style="color:var(--foreground);">${_escHtml(d.title)}</span>
            <span class="flex items-center gap-2 shrink-0">${_stageBadgeCo(d.stage)}<span class="font-data text-xs" style="color:var(--muted-foreground);">${fmtMoney(d.value, d.currency)}</span></span>
          </button>`).join('')}` : ''}
    </div>`;
  }).join('')}</div>`;
}

function _stageBadgeCo(stage) {
  const col = dealStageColors[stage] || { color: 'var(--muted-foreground)', soft: 'var(--secondary)' };
  return `<span class="badge" style="background:${col.soft};color:${col.color};border:1px solid var(--border);">${_escHtml(dealStageLabel[stage] || stage)}</span>`;
}

async function openCompanyDetail(id) {
  openModalShell('Empresa', '', '<p class="text-sm" style="color:var(--muted-foreground);">Cargando…</p>');
  const body = document.getElementById('modal-body');

  const [co, contacts, deals, clients] = await Promise.all([
    api(`/api/companies/${id}`),
    api(`/api/companies/${id}/contacts`),
    api(`/api/companies/${id}/deals`),
    api(`/api/companies/${id}/clients`),
  ]);
  const company = co?.company;
  if (!company) {
    body.innerHTML = emptyState({ headline: 'No encontrada' });
    return;
  }
  document.getElementById('modal-name').textContent = company.name;
  document.getElementById('modal-source').textContent = [company.industry, company.website].filter(Boolean).join(' · ');

  body.innerHTML = `
    <div class="space-y-4 text-sm">
      <div>
        <p class="eyebrow mb-2">Contactos (${(contacts?.contacts || []).length})</p>
        ${(contacts?.contacts || []).slice(0, 12).map((c) => `
          <p class="py-1" style="color:var(--foreground);border-bottom:1px solid var(--border);">${_escHtml(c.name || c.email || '—')} <span style="color:var(--muted-foreground);">${_escHtml(c.email || '')}</span></p>
        `).join('') || '<p style="color:var(--muted-foreground);">Ninguno</p>'}
      </div>
      <div>
        <p class="eyebrow mb-2">Oportunidades (${(deals?.deals || []).length})</p>
        ${(deals?.deals || []).slice(0, 12).map((d) => `
          <button type="button" class="block w-full text-left py-1" style="color:var(--foreground);border-bottom:1px solid var(--border);"
            onclick="openDealDrawer('${d.id}')">${_escHtml(d.title)} · <span style="color:var(--muted-foreground);">${dealStageLabel[d.stage] || _escHtml(d.stage)} · ${fmtMoney(d.value, d.currency)}</span></button>
        `).join('') || '<p style="color:var(--muted-foreground);">Ninguna</p>'}
      </div>
      <div>
        <p class="eyebrow mb-2">Clientes (${(clients?.clients || []).length})</p>
        ${(clients?.clients || []).slice(0, 5).map((c) => `
          <p class="py-1" style="color:var(--foreground);">${_escHtml(c.company || c.leads?.name || c.id)} <span style="color:var(--muted-foreground);">· ${_escHtml(c.status || '')}</span></p>
        `).join('') || '<p style="color:var(--muted-foreground);">Ninguno</p>'}
      </div>
    </div>`;
}

async function _openCreateCompany() {
  const name = prompt('Nombre de la empresa:');
  if (!name || !name.trim()) return;
  const res = await api('/api/companies', { method: 'POST', body: { name: name.trim() } });
  if (res?.ok) {
    showToast('Empresa creada · aparece acá cuando tenga contactos asignados');
    renderCompanies(document.getElementById('view-root'));
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}
