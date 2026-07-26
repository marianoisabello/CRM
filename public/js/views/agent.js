async function renderAgent(root, agentId) {
  if (agentId === 'analyst') {
    return renderAnalystPerfiles(root);
  }

  const info = agentInfo[agentId] || { emoji: '🤖', name: agentId, desc: '' };

  root.innerHTML = `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style="background:white;border:1px solid #E5E7EB;">${info.emoji}</div>
        <div>
          <h1 class="text-xl font-semibold" style="color:#111827;">Agente ${info.name}</h1>
          <p class="text-sm mt-0.5" style="color:#6B7280;">${info.desc}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <!-- Formulario -->
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Ejecutar manualmente</h2>
          ${buildAgentForm(agentId)}
        </div>

        <!-- Historial -->
        <div class="lg:col-span-2">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-sm" style="color:#374151;">Historial de ejecuciones</h2>
            <button onclick="loadAgentRuns('${agentId}')" class="text-xs transition" style="color:#6B7280;">Actualizar</button>
          </div>
          <div id="runs-table" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
            <div class="flex items-center justify-center h-24 text-sm" style="color:#9CA3AF;">Cargando...</div>
          </div>
        </div>
      </div>
    </div>`;

  await loadAgentRuns(agentId);
}

/** Vista principal Analista: perfiles enriquecidos desde Supabase */
async function renderAnalystPerfiles(root) {
  const info = agentInfo.analyst;

  root.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style="background:white;border:1px solid #E5E7EB;">${info.emoji}</div>
          <div>
            <h1 class="text-xl font-semibold" style="color:#111827;">Agente ${info.name}</h1>
            <p class="text-sm mt-0.5" style="color:#6B7280;">${info.desc}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="runPerfilesBatch()" class="btn-primary flex items-center gap-1.5 text-xs">
            Ejecutar batch
          </button>
          <button onclick="refreshPerfiles()" class="btn-ghost flex items-center gap-1.5 text-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Actualizar
          </button>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap items-center">
        <input id="pf-q" type="search" placeholder="Buscar email, nombre o empresa…"
          class="input" style="width:auto;min-width:220px;max-width:320px;"
          onkeydown="if(event.key==='Enter')refreshPerfiles()">
        <select id="pf-cat" onchange="refreshPerfiles()" class="input" style="width:auto;min-width:160px;">
          <option value="">Todas las categorías</option>
          <option value="CALIENTE">Caliente</option>
          <option value="TIBIO">Tibio</option>
          <option value="HOT">Hot</option>
          <option value="WARM">Warm</option>
          <option value="FRIO">Frío</option>
          <option value="COLD">Cold</option>
        </select>
        <p id="perfiles-count" class="text-sm ml-1" style="color:#6B7280;">Cargando...</p>
      </div>

      <div id="perfiles-table-wrap" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
        <div class="flex items-center justify-center h-32 text-sm" style="color:#9CA3AF;">Cargando...</div>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Diagnóstico puntual</h2>
          ${buildAgentForm('analyst')}
        </div>
        <div class="lg:col-span-2">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-sm" style="color:#374151;">Historial de ejecuciones</h2>
            <button onclick="loadAgentRuns('perfiles')" class="text-xs transition" style="color:#6B7280;">Actualizar</button>
          </div>
          <div id="runs-table" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
            <div class="flex items-center justify-center h-24 text-sm" style="color:#9CA3AF;">Cargando...</div>
          </div>
        </div>
      </div>
    </div>`;

  await Promise.all([refreshPerfiles(), loadAgentRuns('perfiles')]);
}

function sdrCategoriaBadge(cat) {
  if (!cat) return '<span class="text-xs" style="color:#9CA3AF;">—</span>';
  const c = String(cat).toUpperCase();
  const map = {
    CALIENTE: 'hot', HOT: 'hot',
    TIBIO: 'warm', WARM: 'warm',
    FRIO: 'cold', COLD: 'cold',
    NO_CALIFICADO: 'unqualified', UNQUALIFIED: 'unqualified',
  };
  const key = map[c] || null;
  if (key) return classificationBadge(key);
  return `<span class="badge bg-gray-100 text-gray-600 border border-gray-200">${cat}</span>`;
}

function renderPerfilesTable(perfiles) {
  if (!perfiles?.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <svg class="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      <p class="text-sm">Sin perfiles aún</p>
    </div>`;
  }

  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Contacto</th>
        <th class="text-left px-4 py-3">Empresa</th>
        <th class="text-left px-4 py-3">Categoría</th>
        <th class="text-left px-4 py-3">Score</th>
        <th class="text-left px-4 py-3">Oferta</th>
        <th class="text-left px-4 py-3">Insight</th>
        <th class="text-left px-4 py-3">Actualizado</th>
      </tr>
    </thead>
    <tbody>
      ${perfiles.map(p => {
        const safe = JSON.stringify(p).replace(/'/g, '&#39;');
        const insight = (p.razones || '').trim();
        const shortInsight = insight.length > 72 ? insight.slice(0, 72) + '…' : insight;
        return `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;cursor:pointer;"
            onclick='openPerfilModal(${safe})'>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style="background:#F5F3FF;color:#7C3AED;">${_avatarInitials(p.nombre || p.email)}</div>
              <div class="min-w-0">
                <p class="font-medium leading-tight" style="color:#111827;">${p.nombre || '<span style="color:#9CA3AF;">Sin nombre</span>'}</p>
                <p class="text-xs mt-0.5 truncate max-w-[180px]" style="color:#9CA3AF;">${p.email || ''}</p>
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            <p class="leading-tight" style="color:#374151;">${p.empresa || '—'}</p>
            <p class="text-xs mt-0.5" style="color:#9CA3AF;">${[p.cargo, p.rubro].filter(Boolean).join(' · ') || ''}</p>
          </td>
          <td class="px-4 py-3">${sdrCategoriaBadge(p.sdr_categoria)}</td>
          <td class="px-4 py-3">${scoreBar(p.score_potencial)}</td>
          <td class="px-4 py-3 text-xs max-w-[140px]" style="color:#6B7280;">${p.oferta_estimada || '—'}</td>
          <td class="px-4 py-3 text-xs max-w-[200px]" style="color:#6B7280;" title="${(insight || '').replace(/"/g, '&quot;')}">${shortInsight || '—'}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(p.updated_at)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function renderPerfilDetail(p) {
  const pains = Array.isArray(p.pain_points_inferidos) ? p.pain_points_inferidos : [];
  const servicios = Array.isArray(p.servicios_recomendados) ? p.servicios_recomendados : [];

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Email</p>
        <p style="color:#374151;">${p.email || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Teléfono</p>
        <p style="color:#374151;">${p.telefono || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Empresa</p>
        <p style="color:#374151;">${p.empresa || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Cargo / Rubro</p>
        <p style="color:#374151;">${[p.cargo, p.rubro].filter(Boolean).join(' · ') || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Categoría SDR</p>
        <div class="mt-0.5">${sdrCategoriaBadge(p.sdr_categoria)}</div>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Score potencial</p>
        <div class="mt-1">${scoreBar(p.score_potencial)}</div>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Score SDR</p>
        <div class="mt-1">${scoreBar(p.sdr_score)}</div>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Oferta estimada</p>
        <p style="color:#374151;">${p.oferta_estimada || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Ciudad</p>
        <p style="color:#374151;">${p.ciudad || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Fuente</p>
        <p style="color:#374151;">${sourceLabel[p.source] || p.source || '—'}</p>
      </div>
    </div>

    ${p.objetivo_original ? `
    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Objetivo original</p>
      <p class="text-xs leading-relaxed" style="color:#374151;">${p.objetivo_original}</p>
    </div>` : ''}

    ${pains.length ? `
    <div class="rounded-lg p-3.5 border" style="background:#FEF3C7;border-color:#FDE68A;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B45309;">Pain points</p>
      <ul class="space-y-1.5">${pains.map(x => `<li class="text-xs leading-relaxed" style="color:#92400E;">• ${typeof x === 'string' ? x : JSON.stringify(x)}</li>`).join('')}</ul>
    </div>` : ''}

    ${servicios.length ? `
    <div class="rounded-lg p-3.5 border" style="background:#EFF6FF;border-color:#BFDBFE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#2563EB;">Servicios recomendados</p>
      <ul class="space-y-1.5">${servicios.map(x => `<li class="text-xs leading-relaxed" style="color:#1E40AF;">• ${typeof x === 'string' ? x : JSON.stringify(x)}</li>`).join('')}</ul>
    </div>` : ''}

    ${p.razones ? `
    <div class="rounded-lg p-3.5 border" style="background:#F5F3FF;border-color:#DDD6FE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#7C3AED;">Razones / insight</p>
      <p class="whitespace-pre-wrap text-xs leading-relaxed" style="color:#5B21B6;">${p.razones}</p>
    </div>` : ''}`;
}

function openPerfilModal(perfil) {
  document.getElementById('modal-name').textContent = perfil.nombre || perfil.email || 'Sin nombre';
  document.getElementById('modal-source').textContent =
    [perfil.empresa, perfil.email].filter(Boolean).join(' · ') + ' · ' + fmtDate(perfil.updated_at);
  document.getElementById('modal-body').innerHTML = renderPerfilDetail(perfil);
  document.getElementById('modal-status-buttons').innerHTML = '';
  const footer = document.getElementById('modal-footer');
  if (footer) footer.style.display = 'none';
  document.getElementById('lead-modal').classList.remove('hidden');
}

async function refreshPerfiles() {
  const params = new URLSearchParams({ limit: '100' });
  const q = document.getElementById('pf-q')?.value?.trim();
  const cat = document.getElementById('pf-cat')?.value;
  if (q) params.set('q', q);
  if (cat) params.set('categoria', cat);

  const res = await api(`/api/agent-runs/perfiles?${params}`);
  const perfiles = res?.perfiles || [];
  const countEl = document.getElementById('perfiles-count');
  if (countEl) {
    countEl.innerHTML = `<span class="font-data font-semibold" style="color:#7C3AED;">${perfiles.length}</span> perfil${perfiles.length !== 1 ? 'es' : ''}`;
  }
  const wrap = document.getElementById('perfiles-table-wrap');
  if (wrap) wrap.innerHTML = renderPerfilesTable(perfiles);
}

async function runPerfilesBatch() {
  const res = await api('/api/agent-runs/perfiles', { method: 'POST', body: { maxAgeDays: 30, limit: 40 } });
  if (res?.ok) {
    showToast('🔍 Batch de perfiles iniciado');
    setTimeout(() => {
      refreshPerfiles();
      loadAgentRuns('perfiles');
    }, 3000);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

function buildAgentForm(agentId) {
  const inputCls = 'input';
  const btnCls = 'mt-4 w-full btn-primary';

  switch (agentId) {
    case 'sdr':
      return `<div class="space-y-3">
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputCls}">
        </div>
        <button onclick="runAgent('sdr')" class="${btnCls}">🎯 Ejecutar SDR</button>
      </div>`;

    case 'analyst':
      return `<div class="space-y-3">
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputCls}">
        </div>
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Notas de reunión</label>
          <textarea id="ag-meeting-notes" rows="4" placeholder="Qué se habló en la reunión..." class="${inputCls}" style="resize:vertical"></textarea>
        </div>
        <button onclick="runAgent('analyst')" class="${btnCls}">🔍 Generar diagnóstico</button>
      </div>`;

    case 'proposal':
      return `<div class="space-y-3">
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputCls}">
        </div>
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Notas de call</label>
          <textarea id="ag-call-notes" rows="3" placeholder="Resumen de la llamada..." class="${inputCls}" style="resize:vertical"></textarea>
        </div>
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Presupuesto estimado (USD)</label>
          <input id="ag-budget" type="number" placeholder="1500" class="${inputCls}">
        </div>
        <button onclick="runAgent('proposal')" class="${btnCls}">📋 Generar propuesta</button>
      </div>`;

    case 'performance': {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
      return `<div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Desde</label>
            <input id="ag-since" type="date" value="${weekAgo}" class="${inputCls}">
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Hasta</label>
            <input id="ag-until" type="date" value="${today}" class="${inputCls}">
          </div>
        </div>
        <button onclick="runAgent('performance')" class="${btnCls}">📈 Analizar performance</button>
      </div>`;
    }

    case 'reporting': {
      const prevMonth = new Date(); prevMonth.setMonth(prevMonth.getMonth() - 1);
      const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;
      return `<div class="space-y-3">
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Client ID</label>
          <input id="ag-client-id" placeholder="uuid del cliente" class="${inputCls}">
        </div>
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Mes (YYYY-MM)</label>
          <input id="ag-month" value="${monthStr}" class="${inputCls}">
        </div>
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Notas del equipo</label>
          <textarea id="ag-team-notes" rows="3" placeholder="Eventos relevantes del mes..." class="${inputCls}" style="resize:vertical"></textarea>
        </div>
        <button onclick="runAgent('reporting')" class="${btnCls}">📊 Generar reporte</button>
      </div>`;
    }

    default:
      return '<p class="text-sm" style="color:#9CA3AF;">Agente no configurado</p>';
  }
}

async function runAgent(agentId) {
  const body = {};
  const leadId = document.getElementById('ag-lead-id')?.value;
  if (leadId) body.lead_id = leadId;
  if (document.getElementById('ag-meeting-notes')) body.meeting_notes = document.getElementById('ag-meeting-notes').value;
  if (document.getElementById('ag-call-notes'))    body.call_notes    = document.getElementById('ag-call-notes').value;
  if (document.getElementById('ag-budget'))        body.budget_estimate = Number(document.getElementById('ag-budget').value) || null;
  if (document.getElementById('ag-since'))         body.since         = document.getElementById('ag-since').value;
  if (document.getElementById('ag-until'))         body.until         = document.getElementById('ag-until').value;
  if (document.getElementById('ag-client-id'))     body.client_id     = document.getElementById('ag-client-id').value;
  if (document.getElementById('ag-month'))         body.month         = document.getElementById('ag-month').value;
  if (document.getElementById('ag-team-notes'))    body.team_notes    = document.getElementById('ag-team-notes').value;

  const res = await api(`/api/agent-runs/${agentId}`, { method: 'POST', body });
  if (res?.ok) {
    showToast(`${agentInfo[agentId]?.emoji} ${agentInfo[agentId]?.name} iniciado`);
    const runsId = agentId === 'analyst' ? 'perfiles' : agentId;
    setTimeout(() => loadAgentRuns(runsId), 2500);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function loadAgentRuns(agentId) {
  const { runs } = await api(`/api/agent-runs?agent_id=${agentId}&limit=20`);
  const wrap = document.getElementById('runs-table');
  if (!wrap) return;

  if (!runs?.length) {
    wrap.innerHTML = `<div class="flex flex-col items-center justify-center py-12" style="color:#D1D5DB;">
      <svg class="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <p class="text-sm" style="color:#9CA3AF;">Sin ejecuciones aún</p>
    </div>`;
    return;
  }

  const statusBadge = {
    running:   'bg-amber-100 text-amber-700 border border-amber-200',
    completed: 'bg-green-100 text-green-700 border border-green-200',
    failed:    'bg-red-100 text-red-700 border border-red-200',
  };

  wrap.innerHTML = `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Lead</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Tokens</th>
        <th class="text-left px-4 py-3">Duración</th>
        <th class="text-left px-4 py-3">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${runs.map(r => `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;">
        <td class="px-4 py-3">
          <p class="font-medium leading-tight" style="color:#111827;">${r.leads?.name || '<span style="color:#9CA3AF;">Sin nombre</span>'}</p>
          <p class="text-xs" style="color:#9CA3AF;">${r.leads?.source || r.agent_id || ''}</p>
        </td>
        <td class="px-4 py-3">
          <span class="badge ${statusBadge[r.status] || 'bg-gray-100 text-gray-500'}">${r.status}</span>
        </td>
        <td class="px-4 py-3 font-data text-xs" style="color:#6B7280;">${r.tokens_used ? r.tokens_used.toLocaleString() : '—'}</td>
        <td class="px-4 py-3 font-data text-xs" style="color:#6B7280;">${r.duration_ms ? `${(r.duration_ms/1000).toFixed(1)}s` : '—'}</td>
        <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(r.created_at)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}
