'use strict';

async function renderContacts(root) {
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('CRM')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Contactos</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Personas del pipeline comercial</p>
        </div>
        <button type="button" onclick="renderContacts(document.getElementById('view-root'))" class="btn-ghost text-xs">Actualizar</button>
      </div>
      <input id="contacts-q" type="search" placeholder="Buscar nombre, email, teléfono…"
        class="w-full rounded-xl px-4 py-2.5 text-sm"
        style="background:var(--elevated);border:1px solid var(--border);color:var(--foreground);"
        onkeydown="if(event.key==='Enter')_loadContacts()" />
      <div id="contacts-table"></div>
    </div>`;
  await _loadContacts();
}

async function _loadContacts() {
  const q = document.getElementById('contacts-q')?.value?.trim() || '';
  const el = document.getElementById('contacts-table');
  if (!el) return;
  el.innerHTML = '<div class="skeleton h-40 rounded-xl"></div>';
  const res = await api(`/api/contacts?limit=100${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const contacts = res?.contacts || [];
  if (!contacts.length) {
    el.innerHTML = emptyState({
      headline: 'Sin contactos',
      body: 'Se crean al pasar un lead a Calificado o Ganado.',
    });
    return;
  }
  el.innerHTML = `
    <div class="overflow-x-auto rounded-xl border" style="border-color:var(--border);">
      <table class="w-full text-sm">
        <thead>
          <tr style="background:var(--elevated);border-bottom:1px solid var(--border);">
            <th class="text-left px-4 py-3 eyebrow" style="color:var(--muted-foreground);">Nombre</th>
            <th class="text-left px-4 py-3 eyebrow" style="color:var(--muted-foreground);">Email</th>
            <th class="text-left px-4 py-3 eyebrow" style="color:var(--muted-foreground);">Empresa</th>
            <th class="text-left px-4 py-3 eyebrow" style="color:var(--muted-foreground);">Rol</th>
          </tr>
        </thead>
        <tbody>
          ${contacts.map((c) => `
            <tr style="border-bottom:1px solid var(--border);"
                onmouseover="this.style.background='var(--elevated)'" onmouseout="this.style.background=''">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  ${avatarHtml(c.name || c.email || '?', { size: 28 })}
                  <span style="color:var(--foreground);">${_escHtml(c.name || '—')}</span>
                </div>
              </td>
              <td class="px-4 py-3 font-data text-xs" style="color:var(--muted-foreground);">${_escHtml(c.email || '—')}</td>
              <td class="px-4 py-3" style="color:var(--foreground);">${_escHtml(c.companies?.name || '—')}</td>
              <td class="px-4 py-3" style="color:var(--muted-foreground);">${_escHtml(c.role || '—')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
