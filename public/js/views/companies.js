'use strict';

async function renderCompanies(root) {
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('CRM')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Empresas</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Cuentas comerciales</p>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="_openCreateCompany()" class="btn-primary text-xs px-3 py-2">+ Empresa</button>
          <button type="button" onclick="renderCompanies(document.getElementById('view-root'))" class="btn-ghost text-xs">Actualizar</button>
        </div>
      </div>
      <div class="relative mb-1">
        <input id="companies-q" type="search" placeholder="Buscar empresa…"
          class="w-full rounded-xl px-4 py-2.5 text-sm"
          style="background:var(--elevated);border:1px solid var(--border);color:var(--foreground);"
          onkeydown="if(event.key==='Enter')_loadCompanies()" />
      </div>
      <div id="companies-list">${'<div class="skeleton h-16 mb-2 rounded-xl"></div>'.repeat(4)}</div>
    </div>`;

  await _loadCompanies();
}

async function _loadCompanies() {
  const q = document.getElementById('companies-q')?.value?.trim() || '';
  const list = document.getElementById('companies-list');
  if (!list) return;
  const res = await api(`/api/companies?limit=100${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const companies = res?.companies || [];
  if (!companies.length) {
    list.innerHTML = emptyState({
      headline: 'Sin empresas',
      body: 'Se crean al calificar leads con company_name o manualmente.',
      actionLabel: 'Crear empresa',
      actionOnclick: '_openCreateCompany()',
    });
    return;
  }
  list.innerHTML = companies.map((c) => `
    <div class="card mb-2 cursor-pointer transition" style="padding:14px 16px;"
         onclick="openCompanyDetail('${c.id}')"
         onmouseover="this.style.borderColor='rgb(43 212 189 / 0.35)'" onmouseout="this.style.borderColor='var(--border)'">
      <div class="flex items-center gap-3">
        ${avatarHtml(c.name || '?', { size: 36 })}
        <div class="min-w-0 flex-1">
          <p class="font-medium text-sm truncate" style="color:var(--foreground);">${_escHtml(c.name)}</p>
          <p class="text-xs mt-0.5 truncate" style="color:var(--muted-foreground);">${_escHtml(c.industry || c.website || '—')}</p>
        </div>
        <span class="font-data text-xs" style="color:var(--muted-foreground);">${fmtDate(c.created_at)}</span>
      </div>
    </div>`).join('');
}

async function openCompanyDetail(id) {
  const modal = document.getElementById('lead-modal');
  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');
  document.getElementById('modal-name').textContent = 'Empresa';
  document.getElementById('modal-source').textContent = '';
  body.innerHTML = '<p class="text-sm" style="color:var(--muted-foreground);">Cargando…</p>';
  if (footer) footer.style.display = 'none';
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('is-open'));

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
  document.getElementById('modal-source').textContent = company.industry || company.website || '';

  body.innerHTML = `
    <div class="space-y-4 text-sm">
      <div>
        <p class="eyebrow mb-2">Contactos (${(contacts?.contacts || []).length})</p>
        ${(contacts?.contacts || []).slice(0, 8).map((c) => `
          <p class="py-1" style="color:var(--foreground);border-bottom:1px solid var(--border);">${_escHtml(c.name || c.email || '—')}</p>
        `).join('') || '<p style="color:var(--muted-foreground);">Ninguno</p>'}
      </div>
      <div>
        <p class="eyebrow mb-2">Deals (${(deals?.deals || []).length})</p>
        ${(deals?.deals || []).slice(0, 8).map((d) => `
          <button type="button" class="block w-full text-left py-1" style="color:var(--foreground);border-bottom:1px solid var(--border);"
            onclick="openDealDrawer('${d.id}')">${_escHtml(d.title)} · <span style="color:var(--muted-foreground);">${dealStageLabel[d.stage] || d.stage}</span></button>
        `).join('') || '<p style="color:var(--muted-foreground);">Ninguno</p>'}
      </div>
      <div>
        <p class="eyebrow mb-2">Clients (${(clients?.clients || []).length})</p>
        ${(clients?.clients || []).slice(0, 5).map((c) => `
          <p class="py-1" style="color:var(--foreground);">${_escHtml(c.company || c.leads?.name || c.id)}</p>
        `).join('') || '<p style="color:var(--muted-foreground);">Ninguno</p>'}
      </div>
    </div>`;
}

async function _openCreateCompany() {
  const name = prompt('Nombre de la empresa:');
  if (!name || !name.trim()) return;
  const res = await api('/api/companies', { method: 'POST', body: { name: name.trim() } });
  if (res?.ok) {
    showToast('Empresa creada');
    _loadCompanies();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}
