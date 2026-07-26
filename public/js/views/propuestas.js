/** Menú / Catálogo de propuestas (Analista) */
async function renderPropuestasMenu(root) {
  root.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style="background:white;border:1px solid #E5E7EB;">📋</div>
          <div>
            <h1 class="text-xl font-semibold" style="color:#111827;">Menú · Propuestas</h1>
            <p class="text-sm mt-0.5" style="color:#6B7280;">Catálogo de servicios y propuestas comerciales de Dana</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="openPropuestaForm()" class="btn-primary flex items-center gap-1.5 text-xs">Nueva propuesta</button>
          <button onclick="refreshPropuestasMenu()" class="btn-ghost flex items-center gap-1.5 text-xs">Actualizar</button>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap items-center">
        <input id="prop-q" type="search" placeholder="Buscar por nombre…"
          class="input" style="width:auto;min-width:220px;max-width:320px;"
          onkeydown="if(event.key==='Enter')refreshPropuestasMenu()">
        <select id="prop-activo" onchange="refreshPropuestasMenu()" class="input" style="width:auto;min-width:140px;">
          <option value="">Todas</option>
          <option value="true" selected>Activas</option>
          <option value="false">Inactivas</option>
        </select>
        <p id="propuestas-count" class="text-sm ml-1" style="color:#6B7280;">Cargando...</p>
      </div>

      <div id="propuestas-table-wrap" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
        <div class="flex items-center justify-center h-32 text-sm" style="color:#9CA3AF;">Cargando...</div>
      </div>

      <div id="propuesta-form-panel" class="card hidden">
        <h2 id="propuesta-form-title" class="font-semibold text-sm mb-4" style="color:#374151;">Nueva propuesta</h2>
        <input type="hidden" id="prop-edit-id" value="">
        <div class="grid md:grid-cols-2 gap-3">
          <div class="md:col-span-2">
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Nombre</label>
            <input id="prop-nombre" class="input" placeholder="Ej. Gestión de redes sociales">
          </div>
          <div class="md:col-span-2">
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Descripción</label>
            <textarea id="prop-desc" rows="2" class="input" style="resize:vertical" placeholder="Qué incluye..."></textarea>
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Precio min</label>
            <input id="prop-min" type="number" class="input" placeholder="800">
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Precio max</label>
            <input id="prop-max" type="number" class="input" placeholder="1200">
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Moneda</label>
            <input id="prop-moneda" class="input" value="USD">
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Tags (coma)</label>
            <input id="prop-tags" class="input" placeholder="redes, mensual">
          </div>
          <div class="md:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="prop-activo-chk" checked>
            <label for="prop-activo-chk" class="text-sm" style="color:#374151;">Activa</label>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button onclick="savePropuestaForm()" class="btn-primary text-xs">Guardar</button>
          <button onclick="closePropuestaForm()" class="btn-ghost text-xs">Cancelar</button>
        </div>
      </div>
    </div>`;

  await refreshPropuestasMenu();
}

function formatPrecioRango(p) {
  if (p.precio_min == null && p.precio_max == null) return '—';
  const mon = p.moneda || 'USD';
  const a = p.precio_min != null ? Number(p.precio_min).toLocaleString() : '?';
  const b = p.precio_max != null ? Number(p.precio_max).toLocaleString() : '?';
  return `${mon} ${a}–${b}`;
}

function renderPropuestasTable(rows) {
  if (!rows?.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <p class="text-sm">Sin propuestas en el catálogo</p>
      <button onclick="openPropuestaForm()" class="btn-primary text-xs mt-3">Crear la primera</button>
    </div>`;
  }

  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Nombre</th>
        <th class="text-left px-4 py-3">Rango</th>
        <th class="text-left px-4 py-3">Tags</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Acciones</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(p => {
        const safe = JSON.stringify(p).replace(/'/g, '&#39;');
        const tags = (p.tags || []).slice(0, 4).join(', ') || '—';
        return `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;">
          <td class="px-4 py-3">
            <p class="font-medium" style="color:#111827;">${p.nombre || '—'}</p>
            <p class="text-xs mt-0.5 max-w-[320px]" style="color:#9CA3AF;">${(p.descripcion || '').slice(0, 100)}${(p.descripcion || '').length > 100 ? '…' : ''}</p>
          </td>
          <td class="px-4 py-3 font-data text-xs" style="color:#6B7280;">${formatPrecioRango(p)}</td>
          <td class="px-4 py-3 text-xs" style="color:#6B7280;">${tags}</td>
          <td class="px-4 py-3">
            <span class="badge ${p.activo ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}">
              ${p.activo ? 'Activa' : 'Inactiva'}
            </span>
          </td>
          <td class="px-4 py-3">
            <div class="flex gap-2">
              <button class="text-xs" style="color:#2563EB;" onclick='openPropuestaForm(${safe})'>Editar</button>
              <button class="text-xs" style="color:#DC2626;" onclick="deactivatePropuesta('${p.id}')">${p.activo ? 'Desactivar' : 'Borrar'}</button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

async function refreshPropuestasMenu() {
  const params = new URLSearchParams({ limit: '100' });
  const q = document.getElementById('prop-q')?.value?.trim();
  const activo = document.getElementById('prop-activo')?.value;
  if (q) params.set('q', q);
  if (activo) params.set('activo', activo);

  const res = await api(`/api/propuestas?${params}`);
  const rows = res?.propuestas || [];
  const countEl = document.getElementById('propuestas-count');
  if (countEl) {
    countEl.innerHTML = `<span class="font-data font-semibold" style="color:#2563EB;">${rows.length}</span> propuesta${rows.length !== 1 ? 's' : ''}`;
  }
  const wrap = document.getElementById('propuestas-table-wrap');
  if (wrap) wrap.innerHTML = renderPropuestasTable(rows);
}

function openPropuestaForm(p) {
  const panel = document.getElementById('propuesta-form-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  document.getElementById('propuesta-form-title').textContent = p?.id ? 'Editar propuesta' : 'Nueva propuesta';
  document.getElementById('prop-edit-id').value = p?.id || '';
  document.getElementById('prop-nombre').value = p?.nombre || '';
  document.getElementById('prop-desc').value = p?.descripcion || '';
  document.getElementById('prop-min').value = p?.precio_min ?? '';
  document.getElementById('prop-max').value = p?.precio_max ?? '';
  document.getElementById('prop-moneda').value = p?.moneda || 'USD';
  document.getElementById('prop-tags').value = (p?.tags || []).join(', ');
  document.getElementById('prop-activo-chk').checked = p?.activo !== false;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closePropuestaForm() {
  const panel = document.getElementById('propuesta-form-panel');
  if (panel) panel.classList.add('hidden');
  document.getElementById('prop-edit-id').value = '';
}

async function savePropuestaForm() {
  const id = document.getElementById('prop-edit-id')?.value;
  const body = {
    nombre: document.getElementById('prop-nombre')?.value?.trim(),
    descripcion: document.getElementById('prop-desc')?.value?.trim(),
    precio_min: document.getElementById('prop-min')?.value,
    precio_max: document.getElementById('prop-max')?.value,
    moneda: document.getElementById('prop-moneda')?.value || 'USD',
    tags: document.getElementById('prop-tags')?.value,
    activo: document.getElementById('prop-activo-chk')?.checked,
  };
  if (!body.nombre) {
    showToast('Nombre requerido', 'error');
    return;
  }

  const res = id
    ? await api(`/api/propuestas/${id}`, { method: 'PATCH', body })
    : await api('/api/propuestas', { method: 'POST', body });

  if (res?.ok) {
    showToast(id ? 'Propuesta actualizada' : 'Propuesta creada');
    closePropuestaForm();
    refreshPropuestasMenu();
  } else {
    showToast(res?.error || 'Error al guardar', 'error');
  }
}

async function deactivatePropuesta(id) {
  if (!confirm('¿Desactivar esta propuesta?')) return;
  const res = await api(`/api/propuestas/${id}`, { method: 'DELETE' });
  if (res?.ok) {
    showToast('Propuesta desactivada');
    refreshPropuestasMenu();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}
