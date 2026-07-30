async function renderAgent(root, agentId) {
  if (agentId === 'analyst') {
    return renderAnalystPerfiles(root);
  }
  if (agentId === 'reuniones') {
    return renderReunionesAgent(root);
  }
  if (agentId === 'briefing') {
    return renderBriefingAgent(root);
  }
  if (agentId === 'performance') {
    return renderPerformanceAgent(root);
  }
  if (agentId === 'reporting') {
    return renderReportingAgent(root);
  }
  if (agentId === 'proposal') {
    return renderProposalAgent(root);
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
          <button onclick="navigate('propuestas')" class="btn-ghost flex items-center gap-1.5 text-xs">
            Menú propuestas
          </button>
          <button onclick="runPerfilesBatch()" class="btn-primary flex items-center gap-1.5 text-xs">
            Ejecutar batch
          </button>
          <button onclick="refreshPerfiles()" class="btn-ghost flex items-center gap-1.5 text-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Actualizar
          </button>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Diagnóstico puntual</h2>
          ${buildAgentForm('analyst')}
        </div>
        <div class="lg:col-span-2">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-sm" style="color:#374151;">Historial de diagnósticos</h2>
            <button type="button" onclick="loadAgentRuns('analyst')" class="text-xs transition" style="color:#6B7280;">Actualizar</button>
          </div>
          <div id="runs-table" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
            <div class="flex items-center justify-center h-24 text-sm" style="color:#9CA3AF;">Cargando...</div>
          </div>
        </div>
      </div>

      <div>
        <div class="flex items-end justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 class="font-semibold text-sm" style="color:#374151;">Análisis</h2>
            <p class="text-xs mt-0.5" style="color:#9CA3AF;">Diagnósticos puntuales + perfiles enriquecidos</p>
          </div>
          <select id="pf-kind" onchange="refreshPerfiles()" class="input" style="width:auto;min-width:150px;">
            <option value="">Todos</option>
            <option value="diagnosis">Diagnósticos</option>
            <option value="perfil">Perfiles</option>
          </select>
        </div>
        <div class="flex gap-2 flex-wrap items-center mb-3">
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
      </div>
    </div>`;

  await Promise.all([refreshPerfiles(), loadAgentRuns('analyst')]);
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

let _analystAnalysesCache = { diagnosis: {}, perfil: {} };

function _analysisKindBadge(kind) {
  if (kind === 'diagnosis') {
    return '<span class="badge bg-violet-100 text-violet-700 border border-violet-200">Diagnóstico</span>';
  }
  return '<span class="badge bg-sky-100 text-sky-700 border border-sky-200">Perfil</span>';
}

function _danaFitBadge(fit) {
  if (!fit) return '<span class="text-xs" style="color:#9CA3AF;">—</span>';
  const f = String(fit).toLowerCase();
  const map = { alto: 'hot', medio: 'warm', bajo: 'cold', high: 'hot', medium: 'warm', low: 'cold' };
  const key = map[f];
  if (key) return classificationBadge(key);
  return `<span class="badge bg-gray-100 text-gray-600 border border-gray-200">${fit}</span>`;
}

function renderAnalystAnalysesTable(rows) {
  if (!rows?.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <svg class="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      <p class="text-sm">Sin análisis aún</p>
      <p class="text-xs mt-1">Generá un diagnóstico arriba o ejecutá el batch de perfiles</p>
    </div>`;
  }

  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Tipo</th>
        <th class="text-left px-4 py-3">Contacto</th>
        <th class="text-left px-4 py-3">Señal</th>
        <th class="text-left px-4 py-3">Resumen</th>
        <th class="text-left px-4 py-3">Actualizado</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row) => {
        const name = _analystEsc(row.name || 'Sin nombre');
        const email = _analystEsc(row.email || '');
        const summary = _analystEsc(row.summary || '—');
        const onclick = row.kind === 'diagnosis'
          ? `openAnalystDiagnosisModal('${row.id}')`
          : `openAnalystPerfilById('${row.id}')`;
        return `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;cursor:pointer;"
            onclick="${onclick}">
          <td class="px-4 py-3">${_analysisKindBadge(row.kind)}</td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style="background:#F5F3FF;color:#7C3AED;">${_avatarInitials(row.name || row.email)}</div>
              <div class="min-w-0">
                <p class="font-medium leading-tight" style="color:#111827;">${name}</p>
                <p class="text-xs mt-0.5 truncate max-w-[180px]" style="color:#9CA3AF;">${email}</p>
              </div>
            </div>
          </td>
          <td class="px-4 py-3">${row.signalHtml || '<span class="text-xs" style="color:#9CA3AF;">—</span>'}</td>
          <td class="px-4 py-3 text-xs max-w-[280px]" style="color:#6B7280;" title="${summary}">${summary}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(row.updated_at)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function renderPerfilesTable(perfiles) {
  // legacy helper — analyst page uses renderAnalystAnalysesTable
  return renderAnalystAnalysesTable((perfiles || []).map((p) => ({
    kind: 'perfil',
    id: p.email || p.lead_id,
    name: p.nombre,
    email: p.email,
    summary: (p.razones || p.oferta_estimada || '').trim().slice(0, 120),
    signalHtml: sdrCategoriaBadge(p.sdr_categoria),
    updated_at: p.updated_at,
  })));
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
    </div>` : ''}

    ${p.research_summary ? `
    <div class="rounded-lg p-3.5 border" style="background:#F0FDF4;border-color:#BBF7D0;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#15803D;">Research (scrape / búsqueda)</p>
      <p class="whitespace-pre-wrap text-xs leading-relaxed" style="color:#166534;">${String(p.research_summary).slice(0, 1200)}${String(p.research_summary).length > 1200 ? '…' : ''}</p>
    </div>` : ''}

    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;" id="perfil-assign-box">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Asignar propuesta (manual)</p>
      <p class="text-xs mb-2" style="color:#6B7280;">
        Actual: ${p.propuesta_id
          ? `<span style="color:#111827;">${p._propuesta_nombre || p.propuesta_id}</span> · origen ${p.propuesta_origen || '—'}`
          : 'ninguna'}
      </p>
      <select id="perfil-prop-select" class="input text-sm mb-2">
        <option value="">Cargando catálogo…</option>
      </select>
      <input id="perfil-prop-notas" class="input text-sm mb-2" placeholder="Notas (opcional)" value="${(p.propuesta_notas || '').replace(/"/g, '&quot;')}">
      <div class="flex gap-2">
        <button type="button" class="btn-primary text-xs" onclick="savePerfilPropuesta('${(p.email || '').replace(/'/g, "\\'")}')">Guardar asignación</button>
        ${p.propuesta_id ? `<button type="button" class="btn-ghost text-xs" onclick="clearPerfilPropuesta('${(p.email || '').replace(/'/g, "\\'")}')">Quitar</button>` : ''}
      </div>
    </div>`;
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
  loadPropuestasIntoSelect(perfil.propuesta_id);
  window._currentPerfil = perfil;
}

function openAnalystPerfilById(id) {
  const perfil = _analystAnalysesCache.perfil?.[id];
  if (!perfil) {
    showToast('Perfil no encontrado', 'error');
    return;
  }
  openPerfilModal(perfil);
}

function _diagnosisList(arr, empty) {
  if (Array.isArray(arr) && arr.length) {
    return `<ul class="space-y-1.5">${arr.map((x) => {
      if (typeof x === 'string') return `<li class="text-xs leading-relaxed" style="color:#374151;">• ${_analystEsc(x)}</li>`;
      if (x && typeof x === 'object') {
        const action = x.action || x.title || '';
        const impact = x.expected_impact ? ` · impacto ${x.expected_impact}` : '';
        const effort = x.effort ? ` · esfuerzo ${x.effort}` : '';
        const label = action || JSON.stringify(x);
        return `<li class="text-xs leading-relaxed" style="color:#374151;">• ${_analystEsc(label)}${_analystEsc(impact + effort)}</li>`;
      }
      return `<li class="text-xs leading-relaxed" style="color:#374151;">• ${_analystEsc(String(x))}</li>`;
    }).join('')}</ul>`;
  }
  return `<p class="text-xs" style="color:#9CA3AF;">${empty}</p>`;
}

function renderDiagnosisDetail(diagnosis, meta = {}) {
  const d = diagnosis && typeof diagnosis === 'object' ? diagnosis : {};
  const pains = d.pain_points || d.pain_points_inferidos || [];
  const opportunities = d.opportunities || [];
  const priorities = d.priorities || [];
  const pending = d.pending_questions || [];
  const resumen = d.situation_summary || d.resumen || d.summary || '';

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Lead</p>
        <p style="color:#374151;">${_analystEsc(meta.name || '—')}</p>
        <p class="text-xs mt-0.5" style="color:#9CA3AF;">${_analystEsc(meta.email || '')}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Fit Dana / Estado</p>
        <div class="mt-0.5 flex items-center gap-2 flex-wrap">
          ${_danaFitBadge(d.dana_fit)}
          ${meta.status ? `<span class="badge bg-gray-100 text-gray-600 border border-gray-200">${_analystEsc(meta.status)}</span>` : ''}
        </div>
      </div>
    </div>

    ${resumen ? `
    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Resumen / situación</p>
      <p class="text-xs leading-relaxed whitespace-pre-wrap" style="color:#374151;">${_analystEsc(resumen)}</p>
    </div>` : ''}

    ${d.dana_fit_reasoning ? `
    <div class="rounded-lg p-3.5 border" style="background:#F5F3FF;border-color:#DDD6FE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#7C3AED;">Por qué encaja con Dana</p>
      <p class="text-xs leading-relaxed" style="color:#5B21B6;">${_analystEsc(d.dana_fit_reasoning)}</p>
    </div>` : ''}

    ${Array.isArray(pains) && pains.length ? `
    <div class="rounded-lg p-3.5 border" style="background:#FEF3C7;border-color:#FDE68A;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B45309;">Pain points</p>
      ${_diagnosisList(pains, 'Sin pain points')}
    </div>` : ''}

    <div class="rounded-lg p-3.5 border" style="background:#EFF6FF;border-color:#BFDBFE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#2563EB;">Oportunidades</p>
      ${_diagnosisList(opportunities, 'Sin oportunidades')}
    </div>

    <div class="rounded-lg p-3.5 border" style="background:#F0FDF4;border-color:#BBF7D0;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#15803D;">Prioridades</p>
      ${_diagnosisList(priorities, 'Sin prioridades')}
    </div>

    <div class="rounded-lg p-3.5 border" style="background:#FEF2F2;border-color:#FECACA;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B91C1C;">Preguntas pendientes</p>
      ${_diagnosisList(pending, 'Sin preguntas pendientes')}
    </div>

    ${d.raw_response ? `
    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Respuesta cruda</p>
      <pre class="text-xs whitespace-pre-wrap leading-relaxed" style="color:#374151;max-height:240px;overflow:auto;">${_analystEsc(String(d.raw_response).slice(0, 4000))}</pre>
    </div>` : ''}

    ${meta.error ? `
    <div class="rounded-lg p-3.5 border" style="background:#FEF2F2;border-color:#FECACA;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B91C1C;">Error</p>
      <p class="text-xs" style="color:#991B1B;">${_analystEsc(meta.error)}</p>
    </div>` : ''}
  `;
}

async function openAnalystDiagnosisModal(runId) {
  const cached = _analystAnalysesCache.diagnosis?.[runId] || _agentRunsCache?.[runId];
  if (!cached) {
    showToast('Diagnóstico no encontrado', 'error');
    return;
  }

  let diagnosis = cached.output_data || cached.diagnosis || null;
  const leadId = cached.lead_id || cached.leads?.id;
  const meta = {
    name: cached.leads?.name || cached.name || 'Diagnóstico',
    email: cached.leads?.email || cached.email || '',
    status: cached.status || '',
    error: cached.error || '',
  };

  if ((!diagnosis || (typeof diagnosis === 'object' && !Object.keys(diagnosis).length)) && leadId) {
    const res = await api(`/api/diagnosis/${leadId}`);
    if (res?.ok && res.diagnosis) diagnosis = res.diagnosis;
  }

  if (!diagnosis && cached.status === 'running') {
    diagnosis = { situation_summary: 'Diagnóstico en curso…' };
  }
  if (!diagnosis) diagnosis = {};

  document.getElementById('modal-name').textContent = meta.name || 'Diagnóstico';
  document.getElementById('modal-source').textContent =
    ['Diagnóstico', meta.email, meta.status, fmtDate(cached.created_at || cached.updated_at)].filter(Boolean).join(' · ');
  document.getElementById('modal-body').innerHTML = renderDiagnosisDetail(diagnosis, meta);
  document.getElementById('modal-status-buttons').innerHTML = '';
  const footer = document.getElementById('modal-footer');
  if (footer) footer.style.display = 'none';
  document.getElementById('lead-modal').classList.remove('hidden');
}

async function loadPropuestasIntoSelect(selectedId) {
  const sel = document.getElementById('perfil-prop-select');
  if (!sel) return;
  const res = await api('/api/propuestas?activo=true&limit=100');
  const rows = res?.propuestas || [];
  if (!rows.length) {
    sel.innerHTML = '<option value="">Sin propuestas (creá en Menú)</option>';
    return;
  }
  sel.innerHTML =
    '<option value="">— Elegir propuesta —</option>' +
    rows
      .map((p) => {
        const label = `${p.nombre}${p.precio_min != null || p.precio_max != null ? ` (${p.moneda || 'USD'} ${p.precio_min ?? '?'}-${p.precio_max ?? '?'})` : ''}`;
        const selAttr = selectedId && p.id === selectedId ? ' selected' : '';
        return `<option value="${p.id}"${selAttr}>${label}</option>`;
      })
      .join('');
}

async function savePerfilPropuesta(email) {
  const propuesta_id = document.getElementById('perfil-prop-select')?.value;
  const notas = document.getElementById('perfil-prop-notas')?.value || '';
  if (!propuesta_id) {
    showToast('Elegí una propuesta del catálogo', 'error');
    return;
  }
  const lead_id = window._currentPerfil?.lead_id || null;
  const res = await api('/api/propuestas/assign', {
    method: 'POST',
    body: { email, propuesta_id, origen: 'manual', notas, lead_id },
  });
  if (res?.ok) {
    showToast(res.message || 'Propuesta asignada');
    closeModal();
    refreshPerfiles();
  } else {
    showToast(res?.error || 'Error al asignar', 'error');
  }
}

async function clearPerfilPropuesta(email) {
  const res = await api('/api/propuestas/assign', {
    method: 'DELETE',
    body: { email },
  });
  if (res?.ok) {
    showToast('Asignación quitada');
    closeModal();
    refreshPerfiles();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function refreshPerfiles() {
  const params = new URLSearchParams({ limit: '100' });
  const q = (document.getElementById('pf-q')?.value || '').trim().toLowerCase();
  const cat = document.getElementById('pf-cat')?.value;
  const kind = document.getElementById('pf-kind')?.value || '';
  if (q) params.set('q', q);
  if (cat) params.set('categoria', cat);

  // Category filter applies only to perfiles; skip diagnoses when a category is set.
  const wantPerfiles = kind !== 'diagnosis';
  const wantDiagnoses = kind !== 'perfil' && !cat;

  const [pfRes, runsRes] = await Promise.all([
    wantPerfiles ? api(`/api/agent-runs/perfiles?${params}`) : Promise.resolve({ ok: true, perfiles: [] }),
    wantDiagnoses ? api('/api/agent-runs?agent_id=analyst&limit=40') : Promise.resolve({ ok: true, runs: [] }),
  ]);

  const perfiles = pfRes?.perfiles || [];
  const runs = (runsRes?.runs || []).filter((r) => r.status === 'completed' || r.status === 'failed' || r.status === 'running');

  _analystAnalysesCache = { diagnosis: {}, perfil: {} };
  const rows = [];

  for (const r of runs) {
    _analystAnalysesCache.diagnosis[r.id] = r;
    const d = r.output_data || {};
    const name = r.leads?.name || 'Sin nombre';
    const email = r.leads?.email || '';
    if (q) {
      const hay = `${name} ${email} ${d.situation_summary || ''}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    const summary = (d.situation_summary || d.resumen || d.raw_response || r.error || r.status || '').toString().trim().slice(0, 120);
    rows.push({
      kind: 'diagnosis',
      id: r.id,
      name,
      email,
      summary,
      signalHtml: _danaFitBadge(d.dana_fit) + (r.status && r.status !== 'completed'
        ? ` <span class="badge bg-gray-100 text-gray-600 border border-gray-200">${r.status}</span>`
        : ''),
      updated_at: r.created_at,
      _ts: new Date(r.created_at || 0).getTime(),
    });
  }

  for (const p of perfiles) {
    const key = p.email || p.lead_id;
    if (!key) continue;
    _analystAnalysesCache.perfil[key] = p;
    const insight = (p.razones || p.oferta_estimada || '').trim();
    rows.push({
      kind: 'perfil',
      id: key,
      name: p.nombre,
      email: p.email,
      summary: insight.slice(0, 120),
      signalHtml: sdrCategoriaBadge(p.sdr_categoria),
      updated_at: p.updated_at,
      _ts: new Date(p.updated_at || 0).getTime(),
    });
  }

  rows.sort((a, b) => (b._ts || 0) - (a._ts || 0));

  const diagCount = rows.filter((r) => r.kind === 'diagnosis').length;
  const pfCount = rows.filter((r) => r.kind === 'perfil').length;
  const countEl = document.getElementById('perfiles-count');
  if (countEl) {
    countEl.innerHTML =
      `<span class="font-data font-semibold" style="color:#7C3AED;">${rows.length}</span> análisis` +
      ` <span style="color:#9CA3AF;">(${diagCount} diag · ${pfCount} perfiles)</span>`;
  }
  const wrap = document.getElementById('perfiles-table-wrap');
  if (wrap) wrap.innerHTML = renderAnalystAnalysesTable(rows);
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
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Buscar lead</label>
          <input id="ag-lead-search" type="search" autocomplete="off"
            placeholder="Nombre o email…"
            class="${inputCls}"
            oninput="onAnalystLeadSearch(this.value)"
            onkeydown="onAnalystLeadSearchKey(event)"
            onfocus="onAnalystLeadSearch(this.value)">
          <input type="hidden" id="ag-lead-id" value="">
          <div id="ag-lead-selected" class="hidden mt-2 rounded-lg px-3 py-2 text-xs border" style="display:none;background:#F9FAFB;border-color:#E5E7EB;">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p id="ag-lead-selected-name" class="font-medium truncate" style="color:#111827;"></p>
                <p id="ag-lead-selected-email" class="truncate mt-0.5" style="color:#6B7280;"></p>
              </div>
              <button type="button" onclick="clearAnalystLead()" class="shrink-0 text-xs" style="color:#9CA3AF;">Cambiar</button>
            </div>
          </div>
          <div id="ag-lead-results" class="hidden mt-1 max-h-56 overflow-auto bg-white border shadow-sm" style="display:none;border-color:#E5E7EB;border-radius:8px;"></div>
        </div>
        <div>
          <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Notas de reunión</label>
          <textarea id="ag-meeting-notes" rows="4" placeholder="Qué se habló en la reunión..." class="${inputCls}" style="resize:vertical"></textarea>
        </div>
        <button type="button" id="ag-generate-diag" onclick="submitAnalystDiagnosis()" class="${btnCls}">Generar diagnóstico</button>
        <div id="ag-diag-status" class="text-xs leading-relaxed" style="display:none;"></div>
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

let _analystLeadSearchTimer = null;
let _analystLeadResults = [];
let _analystDiagBusy = false;

function _analystEsc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _analystShow(el, show) {
  if (!el) return;
  if (show) {
    el.classList.remove('hidden');
    el.style.display = '';
  } else {
    el.classList.add('hidden');
    el.style.display = 'none';
  }
}

function _setAnalystDiagStatus(msg, kind = 'info') {
  const el = document.getElementById('ag-diag-status');
  if (!el) return;
  if (!msg) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  const colors = { info: '#6B7280', ok: '#047857', error: '#B91C1C' };
  el.style.display = 'block';
  el.style.color = colors[kind] || colors.info;
  el.textContent = msg;
}

function clearAnalystLead() {
  const idEl = document.getElementById('ag-lead-id');
  const searchEl = document.getElementById('ag-lead-search');
  const selected = document.getElementById('ag-lead-selected');
  const results = document.getElementById('ag-lead-results');
  if (idEl) idEl.value = '';
  if (searchEl) {
    searchEl.value = '';
    _analystShow(searchEl, true);
  }
  _analystShow(selected, false);
  if (results) {
    results.innerHTML = '';
    _analystShow(results, false);
  }
  _analystLeadResults = [];
  _setAnalystDiagStatus('');
}

function selectAnalystLead(id, name, email) {
  const idEl = document.getElementById('ag-lead-id');
  const searchEl = document.getElementById('ag-lead-search');
  const selected = document.getElementById('ag-lead-selected');
  const nameEl = document.getElementById('ag-lead-selected-name');
  const emailEl = document.getElementById('ag-lead-selected-email');
  const results = document.getElementById('ag-lead-results');
  if (idEl) idEl.value = id || '';
  if (nameEl) nameEl.textContent = name || 'Sin nombre';
  if (emailEl) emailEl.textContent = email || '';
  _analystShow(selected, true);
  _analystShow(searchEl, false);
  if (results) {
    results.innerHTML = '';
    _analystShow(results, false);
  }
  _setAnalystDiagStatus('');
}

function renderAnalystLeadResults(leads) {
  const results = document.getElementById('ag-lead-results');
  if (!results) return;
  _analystLeadResults = leads || [];
  if (!_analystLeadResults.length) {
    results.innerHTML = `<div class="px-3 py-2.5 text-xs" style="color:#9CA3AF;">Sin coincidencias</div>`;
    _analystShow(results, true);
    return;
  }
  results.innerHTML = _analystLeadResults.map((l, i) => {
    const name = _analystEsc(l.name || 'Sin nombre');
    const email = _analystEsc(l.email || '');
    const src = _analystEsc(l.source || l.classification || '');
    return `<button type="button" data-idx="${i}"
        onclick="pickAnalystLead(${i})"
        class="w-full text-left px-3 py-2.5 transition hover:bg-gray-50"
        style="border-top:1px solid #F3F4F6;">
      <p class="text-sm font-medium leading-tight" style="color:#111827;">${name}</p>
      <p class="text-xs mt-0.5 truncate" style="color:#6B7280;">${email}${src ? ' · ' + src : ''}</p>
    </button>`;
  }).join('');
  _analystShow(results, true);
}

function pickAnalystLead(idx) {
  const l = _analystLeadResults[idx];
  if (!l?.id) return;
  selectAnalystLead(l.id, l.name || 'Sin nombre', l.email || '');
}

async function onAnalystLeadSearch(raw) {
  const q = String(raw || '').trim();
  const results = document.getElementById('ag-lead-results');
  const idEl = document.getElementById('ag-lead-id');
  if (_analystLeadSearchTimer) clearTimeout(_analystLeadSearchTimer);

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRe.test(q)) {
    selectAnalystLead(q, 'Lead por ID', q);
    return;
  }

  if (idEl && document.getElementById('ag-lead-search')?.style.display !== 'none') {
    idEl.value = '';
  }

  if (q.length < 2) {
    if (results) {
      results.innerHTML = '';
      _analystShow(results, false);
    }
    _analystLeadResults = [];
    return;
  }

  _analystLeadSearchTimer = setTimeout(async () => {
    const res = await api(`/api/leads?q=${encodeURIComponent(q)}&limit=12`);
    if (!res?.ok) {
      if (results) {
        results.innerHTML = `<div class="px-3 py-2.5 text-xs" style="color:#B91C1C;">${_analystEsc(res?.error || 'Error al buscar')}</div>`;
        _analystShow(results, true);
      }
      return;
    }
    renderAnalystLeadResults(res.leads || []);
  }, 250);
}

function onAnalystLeadSearchKey(event) {
  if (event.key === 'Escape') {
    const results = document.getElementById('ag-lead-results');
    if (results) {
      results.innerHTML = '';
      _analystShow(results, false);
    }
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    if (_analystLeadResults.length === 1) pickAnalystLead(0);
  }
}

async function submitAnalystDiagnosis() {
  if (_analystDiagBusy) return;

  const leadId = document.getElementById('ag-lead-id')?.value?.trim();
  const notes = document.getElementById('ag-meeting-notes')?.value || '';
  const btn = document.getElementById('ag-generate-diag');
  const results = document.getElementById('ag-lead-results');
  if (results) {
    results.innerHTML = '';
    _analystShow(results, false);
  }

  if (!leadId) {
    _setAnalystDiagStatus('Elegí un lead por nombre o email antes de generar.', 'error');
    showToast('Elegí un lead por nombre o email', 'error');
    return;
  }

  _analystDiagBusy = true;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Generando…';
    btn.style.opacity = '0.7';
  }
  _setAnalystDiagStatus('Iniciando diagnóstico…', 'info');

  try {
    const res = await api('/api/agent-runs/analyst', {
      method: 'POST',
      body: { lead_id: leadId, meeting_notes: notes },
    });

    if (!res) {
      _setAnalystDiagStatus('Sesión expirada — volvé a iniciar sesión.', 'error');
      return;
    }

    if (!res.ok) {
      const err = res.error || 'No se pudo iniciar el diagnóstico';
      _setAnalystDiagStatus(err, 'error');
      showToast(err, 'error');
      return;
    }

    _setAnalystDiagStatus('Diagnóstico en curso. El historial y la lista de análisis se actualizan en unos segundos.', 'ok');
    showToast('Diagnóstico iniciado');
    const refreshAnalystViews = () => Promise.all([loadAgentRuns('analyst'), refreshPerfiles()]);
    setTimeout(refreshAnalystViews, 2000);
    setTimeout(refreshAnalystViews, 8000);
  } catch (err) {
    const msg = err?.message || 'Error inesperado';
    _setAnalystDiagStatus(msg, 'error');
    showToast(msg, 'error');
  } finally {
    _analystDiagBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Generar diagnóstico';
      btn.style.opacity = '';
    }
  }
}

async function runAgent(agentId) {
  if (agentId === 'analyst') {
    return submitAnalystDiagnosis();
  }

  const body = {};
  const leadId = document.getElementById('ag-lead-id')?.value?.trim();
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
    showToast(`${agentInfo[agentId]?.emoji || ''} ${agentInfo[agentId]?.name || agentId} iniciado`);
    setTimeout(() => loadAgentRuns(agentId), 2500);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

// Ensure inline onclick handlers can always resolve these (some bundlers/scopes break globals)
window.clearAnalystLead = clearAnalystLead;
window.selectAnalystLead = selectAnalystLead;
window.pickAnalystLead = pickAnalystLead;
window.onAnalystLeadSearch = onAnalystLeadSearch;
window.onAnalystLeadSearchKey = onAnalystLeadSearchKey;
window.submitAnalystDiagnosis = submitAnalystDiagnosis;
window.runAgent = runAgent;
window.openAnalystDiagnosisModal = openAnalystDiagnosisModal;
window.openAnalystPerfilById = openAnalystPerfilById;
window.openPerfilModal = openPerfilModal;
window.refreshPerfiles = refreshPerfiles;

let _agentRunsCache = {};

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

  if (agentId === 'analyst') {
    _agentRunsCache = {};
    for (const r of runs) {
      _agentRunsCache[r.id] = r;
      if (!_analystAnalysesCache.diagnosis) _analystAnalysesCache.diagnosis = {};
      _analystAnalysesCache.diagnosis[r.id] = r;
    }
  }

  const statusBadge = {
    running:   'bg-amber-100 text-amber-700 border border-amber-200',
    completed: 'bg-green-100 text-green-700 border border-green-200',
    failed:    'bg-red-100 text-red-700 border border-red-200',
  };

  const clickable = agentId === 'analyst';

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
      ${runs.map(r => {
        const rowClick = clickable
          ? ` class="data-row transition" style="border-top:1px solid #F3F4F6;cursor:pointer;" onclick="openAnalystDiagnosisModal('${r.id}')"`
          : ` class="data-row transition" style="border-top:1px solid #F3F4F6;"`;
        const preview = clickable && r.output_data?.situation_summary
          ? `<p class="text-xs mt-0.5 truncate max-w-[220px]" style="color:#9CA3AF;">${_analystEsc(String(r.output_data.situation_summary).slice(0, 80))}</p>`
          : `<p class="text-xs" style="color:#9CA3AF;">${_analystEsc(r.leads?.source || r.agent_id || '')}</p>`;
        return `<tr${rowClick}>
        <td class="px-4 py-3">
          <p class="font-medium leading-tight" style="color:#111827;">${r.leads?.name ? _analystEsc(r.leads.name) : '<span style="color:#9CA3AF;">Sin nombre</span>'}</p>
          ${preview}
        </td>
        <td class="px-4 py-3">
          <span class="badge ${statusBadge[r.status] || 'bg-gray-100 text-gray-500'}">${r.status}</span>
        </td>
        <td class="px-4 py-3 font-data text-xs" style="color:#6B7280;">${r.tokens_used ? r.tokens_used.toLocaleString() : '—'}</td>
        <td class="px-4 py-3 font-data text-xs" style="color:#6B7280;">${r.duration_ms ? `${(r.duration_ms/1000).toFixed(1)}s` : '—'}</td>
        <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(r.created_at)}</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

/** Vista Agente 03 — Análisis de Reuniones */
async function renderReunionesAgent(root) {
  const info = agentInfo.reuniones;

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
          <button onclick="navigate('settings')" class="btn-ghost flex items-center gap-1.5 text-xs">Integraciones</button>
          <button onclick="processPendingReuniones()" class="btn-ghost flex items-center gap-1.5 text-xs">Procesar pending</button>
          <button onclick="refreshReuniones()" class="btn-ghost flex items-center gap-1.5 text-xs">Actualizar</button>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Subir transcript</h2>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Título</label>
              <input id="rn-titulo" class="input" placeholder="Discovery · Clínica X">
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Email lead</label>
              <input id="rn-email" type="email" class="input" placeholder="lead@empresa.com">
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Teléfono</label>
              <input id="rn-phone" class="input" placeholder="+54911...">
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Fuente</label>
              <select id="rn-source" class="input">
                <option value="manual">Manual</option>
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Transcript / notas</label>
              <textarea id="rn-transcript" rows="10" class="input" style="resize:vertical" placeholder="Pegá acá la transcripción o notas de la reunión..."></textarea>
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">O subir archivo .txt</label>
              <input id="rn-file" type="file" accept=".txt,.md,.text,text/plain" class="text-xs" onchange="loadReunionFile(event)">
            </div>
            <button onclick="submitReunionTranscript()" class="w-full btn-primary">Analizar reunión</button>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-3">
          <div class="flex gap-2 flex-wrap items-center">
            <input id="rn-q" type="search" placeholder="Buscar email, título…"
              class="input" style="width:auto;min-width:200px;max-width:280px;"
              onkeydown="if(event.key==='Enter')refreshReuniones()">
            <select id="rn-status" onchange="refreshReuniones()" class="input" style="width:auto;min-width:140px;">
              <option value="">Todos los estados</option>
              <option value="pending">Pending</option>
              <option value="analyzing">Analyzing</option>
              <option value="done">Done</option>
              <option value="error">Error</option>
            </select>
            <p id="reuniones-count" class="text-sm ml-1" style="color:#6B7280;">Cargando...</p>
          </div>
          <div id="reuniones-table-wrap" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
            <div class="flex items-center justify-center h-32 text-sm" style="color:#9CA3AF;">Cargando...</div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-sm" style="color:#374151;">Historial de ejecuciones</h2>
              <button onclick="loadAgentRuns('reuniones')" class="text-xs transition" style="color:#6B7280;">Actualizar</button>
            </div>
            <div id="runs-table" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
              <div class="flex items-center justify-center h-24 text-sm" style="color:#9CA3AF;">Cargando...</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  await Promise.all([refreshReuniones(), loadAgentRuns('reuniones')]);
}

function reunionStatusBadge(status) {
  const map = {
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    analyzing: 'bg-sky-100 text-sky-700 border border-sky-200',
    done: 'bg-green-100 text-green-700 border border-green-200',
    error: 'bg-red-100 text-red-700 border border-red-200',
  };
  return `<span class="badge ${map[status] || 'bg-gray-100 text-gray-500'}">${status || '—'}</span>`;
}

function interesBadge(nivel) {
  if (!nivel) return '<span class="text-xs" style="color:#9CA3AF;">—</span>';
  const c = String(nivel).toUpperCase();
  const map = { ALTO: 'hot', MEDIO: 'warm', BAJO: 'cold' };
  const key = map[c];
  if (key) return classificationBadge(key);
  return `<span class="badge bg-gray-100 text-gray-600 border border-gray-200">${nivel}</span>`;
}

function renderReunionesTable(rows) {
  if (!rows?.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <p class="text-sm">Sin reuniones aún</p>
      <p class="text-xs mt-1">Subí un transcript a la izquierda para empezar</p>
    </div>`;
  }

  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Reunión</th>
        <th class="text-left px-4 py-3">Fuente</th>
        <th class="text-left px-4 py-3">Interés</th>
        <th class="text-left px-4 py-3">Score</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Actualizado</th>
        <th class="text-left px-4 py-3"></th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r) => {
        const safe = JSON.stringify(r).replace(/'/g, '&#39;');
        return `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;cursor:pointer;"
            onclick='openReunionModal(${safe})'>
          <td class="px-4 py-3">
            <p class="font-medium leading-tight" style="color:#111827;">${r.titulo || r.lead_email || 'Sin título'}</p>
            <p class="text-xs mt-0.5 truncate max-w-[200px]" style="color:#9CA3AF;">${r.lead_email || r.lead_phone || ''}</p>
          </td>
          <td class="px-4 py-3 text-xs" style="color:#6B7280;">${r.source || '—'}</td>
          <td class="px-4 py-3">${interesBadge(r.nivel_interes)}</td>
          <td class="px-4 py-3">${scoreBar(r.score_cierre)}</td>
          <td class="px-4 py-3">${reunionStatusBadge(r.status)}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(r.updated_at)}</td>
          <td class="px-4 py-3" onclick="event.stopPropagation()">
            ${r.status !== 'done' ? `<button class="btn-ghost text-xs" onclick="analyzeReunionById('${r.id}')">Analizar</button>` : `<button class="btn-ghost text-xs" onclick="analyzeReunionById('${r.id}', true)">Re-analizar</button>`}
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function renderReunionDetail(r) {
  const list = (arr, empty) =>
    Array.isArray(arr) && arr.length
      ? `<ul class="space-y-1.5">${arr.map((x) => `<li class="text-xs leading-relaxed" style="color:#374151;">• ${typeof x === 'string' ? x : JSON.stringify(x)}</li>`).join('')}</ul>`
      : `<p class="text-xs" style="color:#9CA3AF;">${empty}</p>`;

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Email / Tel</p>
        <p style="color:#374151;">${r.lead_email || '—'} · ${r.lead_phone || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Fuente / Estado</p>
        <p style="color:#374151;">${r.source || '—'} · ${r.status || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Nivel interés</p>
        <div class="mt-0.5">${interesBadge(r.nivel_interes)}</div>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Score cierre</p>
        <div class="mt-1">${scoreBar(r.score_cierre)}</div>
      </div>
    </div>

    ${r.resumen ? `
    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Resumen</p>
      <p class="text-xs leading-relaxed" style="color:#374151;">${r.resumen}</p>
    </div>` : ''}

    <div class="rounded-lg p-3.5 border" style="background:#FEF3C7;border-color:#FDE68A;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B45309;">Pain points</p>
      ${list(r.pain_points, 'Sin pain points')}
    </div>

    <div class="rounded-lg p-3.5 border" style="background:#FEF2F2;border-color:#FECACA;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B91C1C;">Objeciones</p>
      ${list(r.objeciones, 'Sin objeciones')}
    </div>

    <div class="rounded-lg p-3.5 border" style="background:#F0FDF4;border-color:#BBF7D0;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#15803D;">Señales de compra</p>
      ${list(r.senales_compra, 'Sin señales')}
    </div>

    <div class="rounded-lg p-3.5 border" style="background:#EFF6FF;border-color:#BFDBFE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#2563EB;">Próximos pasos</p>
      ${list(r.proximos_pasos, 'Sin próximos pasos')}
    </div>

    ${r.error_message ? `
    <div class="rounded-lg p-3.5 border" style="background:#FEF2F2;border-color:#FECACA;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B91C1C;">Error</p>
      <p class="text-xs" style="color:#991B1B;">${r.error_message}</p>
    </div>` : ''}

    <div class="flex gap-2">
      <button class="btn-primary text-xs" onclick="analyzeReunionById('${r.id}', true)">Re-analizar</button>
      ${r.recording_url ? `<a class="btn-ghost text-xs" href="${r.recording_url}" target="_blank" rel="noopener">Ver grabación</a>` : ''}
    </div>`;
}

async function openReunionModal(row) {
  let reunion = row;
  const res = await api(`/api/agent-runs/reuniones/${row.id}`);
  if (res?.ok && res.reunion) reunion = res.reunion;

  document.getElementById('modal-name').textContent = reunion.titulo || reunion.lead_email || 'Reunión';
  document.getElementById('modal-source').textContent =
    [reunion.source, reunion.lead_email, fmtDate(reunion.fecha || reunion.updated_at)].filter(Boolean).join(' · ');
  document.getElementById('modal-body').innerHTML = renderReunionDetail(reunion);
  document.getElementById('modal-status-buttons').innerHTML = '';
  const footer = document.getElementById('modal-footer');
  if (footer) footer.style.display = 'none';
  document.getElementById('lead-modal').classList.remove('hidden');
}

async function refreshReuniones() {
  const params = new URLSearchParams({ limit: '80' });
  const q = document.getElementById('rn-q')?.value?.trim();
  const status = document.getElementById('rn-status')?.value;
  if (q) params.set('q', q);
  if (status) params.set('status', status);

  const res = await api(`/api/agent-runs/reuniones?${params}`);
  const rows = res?.reuniones || [];
  const countEl = document.getElementById('reuniones-count');
  if (countEl) {
    countEl.innerHTML = `<span class="font-data font-semibold" style="color:#2563EB;">${rows.length}</span> reunión${rows.length !== 1 ? 'es' : ''}`;
  }
  const wrap = document.getElementById('reuniones-table-wrap');
  if (wrap) wrap.innerHTML = renderReunionesTable(rows);
}

async function loadReunionFile(ev) {
  const file = ev.target?.files?.[0];
  if (!file) return;
  const text = await file.text();
  const ta = document.getElementById('rn-transcript');
  if (ta) ta.value = text;
  if (!document.getElementById('rn-titulo')?.value) {
    document.getElementById('rn-titulo').value = file.name.replace(/\.[^.]+$/, '');
  }
}

async function submitReunionTranscript() {
  const transcript = document.getElementById('rn-transcript')?.value?.trim();
  if (!transcript) {
    showToast('Pegá o subí un transcript', 'error');
    return;
  }
  const body = {
    transcript,
    titulo: document.getElementById('rn-titulo')?.value || null,
    lead_email: document.getElementById('rn-email')?.value || null,
    lead_phone: document.getElementById('rn-phone')?.value || null,
    source: document.getElementById('rn-source')?.value || 'manual',
    analyze: true,
  };
  const res = await api('/api/agent-runs/reuniones', { method: 'POST', body });
  if (res?.ok) {
    showToast('🎙️ Análisis iniciado');
    document.getElementById('rn-transcript').value = '';
    setTimeout(() => {
      refreshReuniones();
      loadAgentRuns('reuniones');
    }, 3500);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function analyzeReunionById(id, force = false) {
  const res = await api(`/api/agent-runs/reuniones/${id}/analyze`, {
    method: 'POST',
    body: { force: Boolean(force) },
  });
  if (res?.ok) {
    showToast('Análisis iniciado');
    setTimeout(() => {
      refreshReuniones();
      loadAgentRuns('reuniones');
    }, 3500);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function processPendingReuniones() {
  const res = await api('/api/agent-runs/reuniones/process-pending', {
    method: 'POST',
    body: { limit: 10 },
  });
  if (res?.ok) {
    showToast('Procesando pending…');
    setTimeout(() => refreshReuniones(), 4000);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

/** Vista Agente 04 — Briefing Automático */
async function renderBriefingAgent(root) {
  const info = agentInfo.briefing;

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
          <button onclick="processInteresadosBriefings()" class="btn-ghost flex items-center gap-1.5 text-xs">Procesar interesados</button>
          <button onclick="refreshBriefings()" class="btn-ghost flex items-center gap-1.5 text-xs">Actualizar</button>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Generar briefing</h2>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Email del lead</label>
              <input id="bf-email" type="email" class="input" placeholder="lead@empresa.com">
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Lead ID (opcional)</label>
              <input id="bf-lead-id" class="input" placeholder="uuid del lead">
            </div>
            <label class="flex items-center gap-2 text-xs" style="color:#6B7280;">
              <input id="bf-force" type="checkbox" checked>
              Forzar nueva versión
            </label>
            <p class="text-xs leading-relaxed" style="color:#9CA3AF;">Usa el perfil (02), la última reunión done (03) y el catálogo de propuestas.</p>
            <button onclick="submitBriefingGenerate()" class="w-full btn-primary">Generar briefing</button>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-3">
          <div class="flex gap-2 flex-wrap items-center">
            <input id="bf-q" type="search" placeholder="Buscar email, objetivo…"
              class="input" style="width:auto;min-width:200px;max-width:280px;"
              onkeydown="if(event.key==='Enter')refreshBriefings()">
            <select id="bf-status" onchange="refreshBriefings()" class="input" style="width:auto;min-width:140px;">
              <option value="">Todos los estados</option>
              <option value="DRAFT">DRAFT</option>
              <option value="REVISADO">REVISADO</option>
              <option value="ENVIADO">ENVIADO</option>
              <option value="error">error</option>
            </select>
            <p id="briefings-count" class="text-sm ml-1" style="color:#6B7280;">Cargando...</p>
          </div>
          <div id="briefings-table-wrap" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
            <div class="flex items-center justify-center h-32 text-sm" style="color:#9CA3AF;">Cargando...</div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-sm" style="color:#374151;">Historial de ejecuciones</h2>
              <button onclick="loadAgentRuns('briefing')" class="text-xs transition" style="color:#6B7280;">Actualizar</button>
            </div>
            <div id="runs-table" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
              <div class="flex items-center justify-center h-24 text-sm" style="color:#9CA3AF;">Cargando...</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  await Promise.all([refreshBriefings(), loadAgentRuns('briefing')]);
}

function briefingStatusBadge(status) {
  const map = {
    DRAFT: 'bg-amber-100 text-amber-700 border border-amber-200',
    REVISADO: 'bg-sky-100 text-sky-700 border border-sky-200',
    ENVIADO: 'bg-green-100 text-green-700 border border-green-200',
    error: 'bg-red-100 text-red-700 border border-red-200',
  };
  return `<span class="badge ${map[status] || 'bg-gray-100 text-gray-500'}">${status || '—'}</span>`;
}

function renderBriefingsTable(rows) {
  if (!rows?.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <p class="text-sm">Sin briefings aún</p>
      <p class="text-xs mt-1">Generá uno con el email del lead a la izquierda</p>
    </div>`;
  }

  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Lead</th>
        <th class="text-left px-4 py-3">Presupuesto</th>
        <th class="text-left px-4 py-3">Servicios</th>
        <th class="text-left px-4 py-3">Ver</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Actualizado</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r) => {
        const safe = JSON.stringify(r).replace(/'/g, '&#39;');
        const svcs = Array.isArray(r.servicios_sugeridos)
          ? r.servicios_sugeridos.slice(0, 2).join(', ')
          : '';
        return `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;cursor:pointer;"
            onclick='openBriefingModal(${safe})'>
          <td class="px-4 py-3">
            <p class="font-medium leading-tight" style="color:#111827;">${r.lead_email || '—'}</p>
            <p class="text-xs mt-0.5 truncate max-w-[220px]" style="color:#9CA3AF;">${r.objetivo_cliente || ''}</p>
          </td>
          <td class="px-4 py-3 text-xs" style="color:#6B7280;">${r.presupuesto_estimado || '—'}</td>
          <td class="px-4 py-3 text-xs truncate max-w-[180px]" style="color:#6B7280;">${svcs || '—'}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">v${r.version || 1}</td>
          <td class="px-4 py-3">${briefingStatusBadge(r.status)}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(r.updated_at)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function renderBriefingDetail(b) {
  const list = (arr, empty) =>
    Array.isArray(arr) && arr.length
      ? `<ul class="space-y-1.5">${arr.map((x) => `<li class="text-xs leading-relaxed" style="color:#374151;">• ${typeof x === 'string' ? x : JSON.stringify(x)}</li>`).join('')}</ul>`
      : `<p class="text-xs" style="color:#9CA3AF;">${empty}</p>`;

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Email</p>
        <p style="color:#374151;">${b.lead_email || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Estado / Versión</p>
        <p style="color:#374151;">${b.status || '—'} · v${b.version || 1}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Presupuesto</p>
        <p style="color:#374151;">${b.presupuesto_estimado || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Plazo</p>
        <p style="color:#374151;">${b.plazo || '—'}</p>
      </div>
    </div>

    ${b.resumen_ejecutivo ? `
    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Resumen ejecutivo</p>
      <p class="text-xs leading-relaxed" style="color:#374151;">${b.resumen_ejecutivo}</p>
    </div>` : ''}

    <div class="rounded-lg p-3.5 border" style="background:#EFF6FF;border-color:#BFDBFE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#2563EB;">Servicios sugeridos</p>
      ${list(b.servicios_sugeridos, 'Sin servicios')}
    </div>

    <div class="rounded-lg p-3.5 border" style="background:#F0FDF4;border-color:#BBF7D0;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#15803D;">KPIs</p>
      ${list(b.kpis, 'Sin KPIs')}
    </div>

    <div class="rounded-lg p-3.5 border" style="background:#FEF3C7;border-color:#FDE68A;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B45309;">Riesgos</p>
      ${list(b.riesgos_detectados, 'Sin riesgos')}
    </div>

    <div class="rounded-lg p-3.5 border" style="background:#EEF2FF;border-color:#C7D2FE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#4338CA;">Diferenciadores</p>
      ${list(b.diferenciadores, 'Sin diferenciadores')}
    </div>

    ${b.brief_markdown ? `
    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Brief (markdown)</p>
      <pre class="text-xs whitespace-pre-wrap leading-relaxed" style="color:#374151;max-height:280px;overflow:auto;">${b.brief_markdown.replace(/</g, '&lt;')}</pre>
    </div>` : ''}

    ${b.error_message ? `
    <div class="rounded-lg p-3.5 border" style="background:#FEF2F2;border-color:#FECACA;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B91C1C;">Error</p>
      <p class="text-xs" style="color:#991B1B;">${b.error_message}</p>
    </div>` : ''}

    <div class="flex gap-2 flex-wrap">
      <button class="btn-ghost text-xs" onclick="setBriefingStatus('${b.id}','DRAFT')">DRAFT</button>
      <button class="btn-ghost text-xs" onclick="setBriefingStatus('${b.id}','REVISADO')">REVISADO</button>
      <button class="btn-primary text-xs" onclick="setBriefingStatus('${b.id}','ENVIADO')">ENVIADO</button>
      <button class="btn-ghost text-xs" onclick="regenerateBriefing('${b.id}')">Regenerar</button>
    </div>`;
}

async function openBriefingModal(row) {
  let briefing = row;
  const res = await api(`/api/agent-runs/briefings/${row.id}`);
  if (res?.ok && res.briefing) briefing = res.briefing;

  document.getElementById('modal-name').textContent = briefing.lead_email || 'Briefing';
  document.getElementById('modal-source').textContent =
    [briefing.status, `v${briefing.version || 1}`, fmtDate(briefing.updated_at)].filter(Boolean).join(' · ');
  document.getElementById('modal-body').innerHTML = renderBriefingDetail(briefing);
  document.getElementById('modal-status-buttons').innerHTML = '';
  const footer = document.getElementById('modal-footer');
  if (footer) footer.style.display = 'none';
  document.getElementById('lead-modal').classList.remove('hidden');
}

async function refreshBriefings() {
  const params = new URLSearchParams({ limit: '80' });
  const q = document.getElementById('bf-q')?.value?.trim();
  const status = document.getElementById('bf-status')?.value;
  if (q) params.set('q', q);
  if (status) params.set('status', status);

  const res = await api(`/api/agent-runs/briefings?${params}`);
  const rows = res?.briefings || [];
  const countEl = document.getElementById('briefings-count');
  if (countEl) {
    countEl.innerHTML = `<span class="font-data font-semibold" style="color:#2563EB;">${rows.length}</span> briefing${rows.length !== 1 ? 's' : ''}`;
  }
  const wrap = document.getElementById('briefings-table-wrap');
  if (wrap) wrap.innerHTML = renderBriefingsTable(rows);
}

async function submitBriefingGenerate() {
  const email = document.getElementById('bf-email')?.value?.trim();
  const lead_id = document.getElementById('bf-lead-id')?.value?.trim() || null;
  if (!email && !lead_id) {
    showToast('Indicá email o lead_id', 'error');
    return;
  }
  showToast('Generando briefing…');
  const res = await api('/api/agent-runs/briefings', {
    method: 'POST',
    body: {
      email: email || null,
      lead_id,
      force: Boolean(document.getElementById('bf-force')?.checked),
    },
  });
  if (res?.ok) {
    showToast('✓ Briefing guardado');
    if (document.getElementById('bf-email')) document.getElementById('bf-email').value = '';
    refreshBriefings();
    loadAgentRuns('briefing');
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function setBriefingStatus(id, status) {
  const res = await api(`/api/agent-runs/briefings/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
  if (res?.ok) {
    showToast(`Estado: ${status}`);
    openBriefingModal(res.briefing);
    refreshBriefings();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function regenerateBriefing(id) {
  showToast('Regenerando…');
  const res = await api(`/api/agent-runs/briefings/${id}/regenerate`, {
    method: 'POST',
    body: {},
  });
  if (res?.ok) {
    showToast('✓ Nueva versión');
    openBriefingModal(res.briefing);
    refreshBriefings();
    loadAgentRuns('briefing');
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function processInteresadosBriefings() {
  const res = await api('/api/agent-runs/briefings/process-interesados', {
    method: 'POST',
    body: { limit: 5 },
  });
  if (res?.ok) {
    showToast('Procesando interesados…');
    setTimeout(() => {
      refreshBriefings();
      loadAgentRuns('briefing');
    }, 8000);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

/** Vista Agente Performance — análisis multi-canal */
const PERF_CHANNEL_OPTIONS = [
  { id: 'meta_ads', label: 'Meta Ads' },
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'linkedin_ads', label: 'LinkedIn Ads' },
  { id: 'tiktok_ads', label: 'TikTok Ads' },
  { id: 'ga4', label: 'GA4 / Orgánico web' },
  { id: 'instagram_organic', label: 'Instagram orgánico' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

async function renderPerformanceAgent(root) {
  const info = agentInfo.performance;
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const channelChecks = PERF_CHANNEL_OPTIONS.map((c) => `
    <label class="flex items-center gap-2 text-xs cursor-pointer" style="color:#374151;">
      <input type="checkbox" class="pfm-channel" value="${c.id}" checked style="accent-color:#2563EB;">
      ${c.label}
    </label>`).join('');

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
        <button onclick="refreshPerfReports()" class="btn-ghost flex items-center gap-1.5 text-xs">Actualizar</button>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Analizar período</h2>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Desde</label>
                <input id="pfm-since" type="date" value="${weekAgo}" class="input">
              </div>
              <div>
                <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Hasta</label>
                <input id="pfm-until" type="date" value="${today}" class="input">
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-semibold uppercase tracking-wider" style="color:#9CA3AF;">Canales</label>
                <div class="flex gap-2">
                  <button type="button" onclick="setAllPerfChannels(true)" class="text-xs" style="color:#2563EB;">Todos</button>
                  <button type="button" onclick="setAllPerfChannels(false)" class="text-xs" style="color:#6B7280;">Ninguno</button>
                </div>
              </div>
              <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">${channelChecks}</div>
            </div>
            <p class="text-xs leading-relaxed" style="color:#9CA3AF;">Sin tokens live usa métricas DEMO por canal. Acciones sensibles quedan pendientes de aprobación. Fuentes en Configuración.</p>
            <button onclick="submitPerformanceAnalyze()" class="w-full btn-primary">📈 Analizar performance</button>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-3">
          <div class="flex gap-2 flex-wrap items-center">
            <select id="pfm-status" onchange="refreshPerfReports()" class="input" style="width:auto;min-width:160px;">
              <option value="">Todos los estados</option>
              <option value="pending_approval">pending_approval</option>
              <option value="approved">approved</option>
              <option value="done">done</option>
            </select>
            <p id="perf-count" class="text-sm ml-1" style="color:#6B7280;">Cargando...</p>
          </div>
          <div id="perf-table-wrap" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
            <div class="flex items-center justify-center h-32 text-sm" style="color:#9CA3AF;">Cargando...</div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-sm" style="color:#374151;">Historial de ejecuciones</h2>
              <button onclick="loadAgentRuns('performance')" class="text-xs transition" style="color:#6B7280;">Actualizar</button>
            </div>
            <div id="runs-table" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
              <div class="flex items-center justify-center h-24 text-sm" style="color:#9CA3AF;">Cargando...</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  await Promise.all([refreshPerfReports(), loadAgentRuns('performance')]);
}

function setAllPerfChannels(checked) {
  document.querySelectorAll('.pfm-channel').forEach((el) => { el.checked = checked; });
}

function getSelectedPerfChannels() {
  return Array.from(document.querySelectorAll('.pfm-channel:checked')).map((el) => el.value);
}

function perfChannelChips(channels) {
  const ids = (channels || []).map((c) => (typeof c === 'string' ? c : c.id || c.channel)).filter(Boolean);
  if (!ids.length) return '<span class="text-xs" style="color:#9CA3AF;">—</span>';
  const labelOf = (id) => (PERF_CHANNEL_OPTIONS.find((c) => c.id === id) || {}).label || id;
  return ids.slice(0, 5).map((id) =>
    `<span class="text-xs px-1.5 py-0.5 rounded" style="background:#F3F4F6;color:#4B5563;">${labelOf(id)}</span>`
  ).join(' ') + (ids.length > 5 ? ` <span class="text-xs" style="color:#9CA3AF;">+${ids.length - 5}</span>` : '');
}

function perfStatusBadge(status) {
  const map = {
    pending_approval: 'bg-amber-100 text-amber-700 border border-amber-200',
    approved: 'bg-green-100 text-green-700 border border-green-200',
    done: 'bg-sky-100 text-sky-700 border border-sky-200',
  };
  return `<span class="badge ${map[status] || 'bg-gray-100 text-gray-500'}">${status || '—'}</span>`;
}

function renderPerfReportsTable(rows) {
  if (!rows?.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <p class="text-sm">Sin reportes de performance aún</p>
      <p class="text-xs mt-1">Analizá un período a la izquierda</p>
    </div>`;
  }

  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Período</th>
        <th class="text-left px-4 py-3">Canales</th>
        <th class="text-left px-4 py-3">Resumen</th>
        <th class="text-left px-4 py-3">Alertas</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r) => {
        const safe = JSON.stringify(r).replace(/'/g, '&#39;');
        const summary = (r.analysis?.summary || '').slice(0, 70);
        const alerts = Array.isArray(r.analysis?.alerts) ? r.analysis.alerts.length : 0;
        const channels = r.analysis?.channels_analyzed || Object.keys(r.analysis?.metrics_snapshot || {});
        return `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;cursor:pointer;"
            onclick='openPerfReportModal(${safe})'>
          <td class="px-4 py-3 font-data text-xs" style="color:#374151;">${r.period_since} → ${r.period_until}</td>
          <td class="px-4 py-3"><div class="flex flex-wrap gap-1">${perfChannelChips(channels)}</div></td>
          <td class="px-4 py-3 text-xs truncate max-w-[200px]" style="color:#6B7280;">${summary || '—'}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#6B7280;">${alerts}</td>
          <td class="px-4 py-3">${perfStatusBadge(r.status)}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(r.created_at)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function renderPerfReportDetail(r) {
  const a = r.analysis || {};
  const labelOf = (id) => (PERF_CHANNEL_OPTIONS.find((c) => c.id === id) || {}).label || id;
  const list = (arr, empty) =>
    Array.isArray(arr) && arr.length
      ? `<ul class="space-y-1.5">${arr.map((x) => {
          if (typeof x === 'string') return `<li class="text-xs" style="color:#374151;">• ${x}</li>`;
          const ch = x.channel ? `[${labelOf(x.channel)}] ` : '';
          const label = x.campaign || x.action || x.issue || x.highlight || JSON.stringify(x);
          const extra = x.severity || x.expected_impact || (x.issue && x.campaign ? x.issue : '') || '';
          return `<li class="text-xs" style="color:#374151;">• ${ch}<strong>${label}</strong>${extra && extra !== label ? ` — ${extra}` : ''}</li>`;
        }).join('')}</ul>`
      : `<p class="text-xs" style="color:#9CA3AF;">${empty}</p>`;

  const breakdown = Array.isArray(a.channel_breakdown) && a.channel_breakdown.length
    ? `<div class="rounded-lg p-3.5 border" style="background:#F0FDF4;border-color:#BBF7D0;">
        <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#15803D;">Breakdown por canal</p>
        <ul class="space-y-1.5">${a.channel_breakdown.map((b) => {
          const id = b.channel || b.id;
          const hi = b.highlight || (b.rows != null ? `${b.rows} filas` : '') || '';
          return `<li class="text-xs" style="color:#374151;">• <strong>${b.label || labelOf(id)}</strong>${hi ? ` — ${hi}` : ''}${b.severity ? ` · ${b.severity}` : ''}</li>`;
        }).join('')}</ul>
      </div>`
    : '';

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Período</p>
        <p style="color:#374151;">${r.period_since} → ${r.period_until}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Estado / Fuente</p>
        <p style="color:#374151;">${r.status || '—'} · ${a.data_source || '—'}</p>
      </div>
    </div>
    <div>
      <p class="text-xs font-semibold mb-1.5 uppercase tracking-wider" style="color:#9CA3AF;">Canales</p>
      <div class="flex flex-wrap gap-1">${perfChannelChips(a.channels_analyzed || Object.keys(a.metrics_snapshot || {}))}</div>
    </div>
    ${a.summary ? `<div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Resumen</p>
      <p class="text-xs leading-relaxed" style="color:#374151;">${a.summary}</p>
    </div>` : ''}
    ${breakdown}
    <div class="rounded-lg p-3.5 border" style="background:#FEF2F2;border-color:#FECACA;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B91C1C;">Alertas por canal</p>
      ${list(a.alerts, 'Sin alertas')}
    </div>
    <div class="rounded-lg p-3.5 border" style="background:#EFF6FF;border-color:#BFDBFE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#2563EB;">Recomendaciones</p>
      ${list(a.recommendations, 'Sin recomendaciones')}
    </div>
    <div class="rounded-lg p-3.5 border" style="background:#FEF3C7;border-color:#FDE68A;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B45309;">Pendiente aprobación</p>
      ${list(r.actions_pending_approval || a.actions_pending_approval, 'Nada pendiente')}
    </div>
    ${r.status === 'pending_approval' ? `
    <button class="btn-primary text-xs" onclick="approvePerfReport('${r.id}')">Aprobar acciones</button>` : ''}
  `;
}

async function openPerfReportModal(row) {
  let report = row;
  const res = await api(`/api/campaigns/reports/${row.id}`);
  if (res?.ok && res.report) report = res.report;

  document.getElementById('modal-name').textContent = 'Performance · ' + (report.period_since || '');
  document.getElementById('modal-source').textContent = report.status || '';
  document.getElementById('modal-body').innerHTML = renderPerfReportDetail(report);
  const footer = document.getElementById('modal-footer');
  if (footer) footer.style.display = 'none';
  document.getElementById('lead-modal').classList.remove('hidden');
}

async function refreshPerfReports() {
  const status = document.getElementById('pfm-status')?.value || '';
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await api(`/api/campaigns/reports${qs}`);
  const wrap = document.getElementById('perf-table-wrap');
  const count = document.getElementById('perf-count');
  if (count) count.textContent = `${res?.count || 0} reportes`;
  if (wrap) wrap.innerHTML = renderPerfReportsTable(res?.reports || []);
}

async function submitPerformanceAnalyze() {
  const since = document.getElementById('pfm-since')?.value;
  const until = document.getElementById('pfm-until')?.value;
  const channels = getSelectedPerfChannels();
  if (!since || !until) {
    showToast('Completá desde / hasta', 'error');
    return;
  }
  if (!channels.length) {
    showToast('Seleccioná al menos un canal', 'error');
    return;
  }
  showToast('Analizando performance…');
  const res = await api('/api/campaigns/analyze', {
    method: 'POST',
    body: { since, until, channels },
  });
  if (res?.ok) {
    showToast('✓ Análisis listo');
    refreshPerfReports();
    loadAgentRuns('performance');
    if (res.analysis?.report_id) {
      const detail = await api(`/api/campaigns/reports/${res.analysis.report_id}`);
      if (detail?.report) openPerfReportModal(detail.report);
    }
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function approvePerfReport(id) {
  const res = await api(`/api/campaigns/reports/${id}/approve`, { method: 'POST', body: {} });
  if (res?.ok) {
    showToast('Aprobado');
    openPerfReportModal(res.report);
    refreshPerfReports();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

/** Vista Agente Reporting — reportes mensuales por cliente */
async function renderReportingAgent(root) {
  const info = agentInfo.reporting;
  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

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
        <button onclick="refreshMonthlyReports()" class="btn-ghost flex items-center gap-1.5 text-xs">Actualizar</button>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Generar reporte</h2>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Cliente</label>
              <select id="rpt-client" class="input"><option value="">Cargando clientes…</option></select>
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Mes (YYYY-MM)</label>
              <input id="rpt-month" value="${monthStr}" class="input" placeholder="2026-06">
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Notas del equipo</label>
              <textarea id="rpt-notes" rows="3" class="input" style="resize:vertical" placeholder="Eventos relevantes del mes…"></textarea>
            </div>
            <p class="text-xs leading-relaxed" style="color:#9CA3AF;">Queda en pending_approval hasta que lo revises.</p>
            <button onclick="submitMonthlyReport()" class="w-full btn-primary">📊 Generar reporte</button>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-3">
          <div class="flex gap-2 flex-wrap items-center">
            <select id="rpt-status" onchange="refreshMonthlyReports()" class="input" style="width:auto;min-width:160px;">
              <option value="">Todos los estados</option>
              <option value="pending_approval">pending_approval</option>
              <option value="approved">approved</option>
              <option value="sent">sent</option>
            </select>
            <p id="rpt-count" class="text-sm ml-1" style="color:#6B7280;">Cargando...</p>
          </div>
          <div id="rpt-table-wrap" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
            <div class="flex items-center justify-center h-32 text-sm" style="color:#9CA3AF;">Cargando...</div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-sm" style="color:#374151;">Historial de ejecuciones</h2>
              <button onclick="loadAgentRuns('reporting')" class="text-xs transition" style="color:#6B7280;">Actualizar</button>
            </div>
            <div id="runs-table" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
              <div class="flex items-center justify-center h-24 text-sm" style="color:#9CA3AF;">Cargando...</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  await Promise.all([loadReportingClients(), refreshMonthlyReports(), loadAgentRuns('reporting')]);
}

async function loadReportingClients() {
  const sel = document.getElementById('rpt-client');
  if (!sel) return;
  const res = await api('/api/reports/clients');
  const clients = res?.clients || [];
  if (!clients.length) {
    sel.innerHTML = '<option value="">Sin clientes activos — seed demo o marcá un lead como won</option>';
    return;
  }
  sel.innerHTML =
    '<option value="">— Elegir cliente —</option>' +
    clients
      .map((c) => `<option value="${c.id}">${c.company || c.leads?.name || c.id.slice(0, 8)}</option>`)
      .join('');
}

function monthlyStatusBadge(status) {
  const map = {
    pending_approval: 'bg-amber-100 text-amber-700 border border-amber-200',
    approved: 'bg-sky-100 text-sky-700 border border-sky-200',
    sent: 'bg-green-100 text-green-700 border border-green-200',
  };
  return `<span class="badge ${map[status] || 'bg-gray-100 text-gray-500'}">${status || '—'}</span>`;
}

function renderMonthlyReportsTable(rows) {
  if (!rows?.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <p class="text-sm">Sin reportes mensuales aún</p>
      <p class="text-xs mt-1">Elegí un cliente y generá el del mes</p>
    </div>`;
  }

  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Cliente</th>
        <th class="text-left px-4 py-3">Mes</th>
        <th class="text-left px-4 py-3">Headline</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r) => {
        const safe = JSON.stringify(r).replace(/'/g, '&#39;');
        const company = r.clients?.company || r.client_id?.slice(0, 8) || '—';
        const headline = (r.report?.headline || '').slice(0, 80);
        return `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;cursor:pointer;"
            onclick='openMonthlyReportModal(${safe})'>
          <td class="px-4 py-3 font-medium text-xs" style="color:#111827;">${company}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#6B7280;">${r.month}</td>
          <td class="px-4 py-3 text-xs truncate max-w-[240px]" style="color:#6B7280;">${headline || '—'}</td>
          <td class="px-4 py-3">${monthlyStatusBadge(r.status)}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(r.created_at)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function renderMonthlyReportDetail(r) {
  const rep = r.report || {};
  const list = (arr, empty) =>
    Array.isArray(arr) && arr.length
      ? `<ul class="space-y-1.5">${arr.map((x) => {
          if (typeof x === 'string') return `<li class="text-xs" style="color:#374151;">• ${x}</li>`;
          return `<li class="text-xs" style="color:#374151;">• <strong>${x.metric || ''}</strong> ${x.value || ''} <span style="color:#9CA3AF;">${x.vs_previous || ''}</span></li>`;
        }).join('')}</ul>`
      : `<p class="text-xs" style="color:#9CA3AF;">${empty}</p>`;

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Cliente</p>
        <p style="color:#374151;">${r.clients?.company || r.client_id || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Mes / Estado</p>
        <p style="color:#374151;">${r.month} · ${r.status}</p>
      </div>
    </div>
    ${rep.headline ? `<div class="rounded-lg p-3.5 border" style="background:#EFF6FF;border-color:#BFDBFE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#2563EB;">Headline</p>
      <p class="text-sm font-medium" style="color:#111827;">${rep.headline}</p>
    </div>` : ''}
    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Key metrics</p>
      ${list(rep.key_metrics, 'Sin métricas')}
    </div>
    ${Array.isArray(rep.channel_highlights) && rep.channel_highlights.length ? `
    <div class="rounded-lg p-3.5 border" style="background:#ECFDF5;border-color:#A7F3D0;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#047857;">Highlights por canal</p>
      <ul class="space-y-1.5">${rep.channel_highlights.map((h) =>
        `<li class="text-xs" style="color:#374151;">• <strong>${h.channel || ''}</strong> — ${h.note || ''}</li>`
      ).join('')}</ul>
    </div>` : ''}
    <div class="rounded-lg p-3.5 border" style="background:#F0FDF4;border-color:#BBF7D0;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#15803D;">Wins</p>
      ${list(rep.wins, 'Sin wins')}
    </div>
    <div class="rounded-lg p-3.5 border" style="background:#FEF3C7;border-color:#FDE68A;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B45309;">Explicaciones</p>
      ${list(rep.explanations, 'Sin explicaciones')}
    </div>
    <div class="rounded-lg p-3.5 border" style="background:#EEF2FF;border-color:#C7D2FE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#4338CA;">Plan próximo mes</p>
      ${list(rep.next_month_plan, 'Sin plan')}
    </div>
    <div class="flex gap-2 flex-wrap">
      ${r.status === 'pending_approval' ? `<button class="btn-primary text-xs" onclick="approveMonthlyReport('${r.id}')">Aprobar</button>` : ''}
      ${r.status === 'approved' ? `<button class="btn-primary text-xs" onclick="markMonthlySent('${r.id}')">Marcar enviado</button>` : ''}
    </div>`;
}

async function openMonthlyReportModal(row) {
  let report = row;
  const res = await api(`/api/reports/${row.id}`);
  if (res?.ok && res.report) report = res.report;

  document.getElementById('modal-name').textContent = `Reporte · ${report.month || ''}`;
  document.getElementById('modal-source').textContent = report.clients?.company || report.status || '';
  document.getElementById('modal-body').innerHTML = renderMonthlyReportDetail(report);
  const footer = document.getElementById('modal-footer');
  if (footer) footer.style.display = 'none';
  document.getElementById('lead-modal').classList.remove('hidden');
}

async function refreshMonthlyReports() {
  const status = document.getElementById('rpt-status')?.value || '';
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await api(`/api/reports${qs}`);
  const wrap = document.getElementById('rpt-table-wrap');
  const count = document.getElementById('rpt-count');
  if (count) count.textContent = `${res?.count || 0} reportes`;
  if (wrap) wrap.innerHTML = renderMonthlyReportsTable(res?.reports || []);
}

async function submitMonthlyReport() {
  const client_id = document.getElementById('rpt-client')?.value;
  const month = document.getElementById('rpt-month')?.value;
  const team_notes = document.getElementById('rpt-notes')?.value || '';
  if (!client_id || !month) {
    showToast('Elegí cliente y mes', 'error');
    return;
  }
  showToast('Generando reporte…');
  const res = await api('/api/reports/monthly', {
    method: 'POST',
    body: { client_id, month, team_notes },
  });
  if (res?.ok) {
    showToast('✓ Reporte generado (pending)');
    refreshMonthlyReports();
    loadAgentRuns('reporting');
    if (res.report?.report_id) {
      const detail = await api(`/api/reports/${res.report.report_id}`);
      if (detail?.report) openMonthlyReportModal(detail.report);
    }
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function approveMonthlyReport(id) {
  const res = await api(`/api/reports/${id}/approve`, { method: 'POST', body: {} });
  if (res?.ok) {
    showToast('Aprobado');
    openMonthlyReportModal(res.report);
    refreshMonthlyReports();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function markMonthlySent(id) {
  const res = await api(`/api/reports/${id}/sent`, { method: 'POST', body: {} });
  if (res?.ok) {
    showToast('Marcado como enviado');
    openMonthlyReportModal(res.report);
    refreshMonthlyReports();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

/** Vista Propuestas IA — complementa Briefing + catálogo */
async function renderProposalAgent(root) {
  const info = agentInfo.proposal;

  root.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style="background:white;border:1px solid #E5E7EB;">${info.emoji}</div>
          <div>
            <h1 class="text-xl font-semibold" style="color:#111827;">Agente ${info.name}</h1>
            <p class="text-sm mt-0.5" style="color:#6B7280;">${info.desc} Usa perfil/reunión si no hay diagnóstico legacy.</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="navigate('propuestas')" class="btn-ghost flex items-center gap-1.5 text-xs">Menú · Propuestas</button>
          <button onclick="navigate('agent/briefing')" class="btn-ghost flex items-center gap-1.5 text-xs">Briefing</button>
          <button onclick="refreshIaProposals()" class="btn-ghost flex items-center gap-1.5 text-xs">Actualizar</button>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Generar propuesta IA</h2>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Lead ID</label>
              <input id="prop-lead-id" class="input" placeholder="uuid del lead">
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Notas de call</label>
              <textarea id="prop-notes" rows="3" class="input" style="resize:vertical" placeholder="Resumen discovery…"></textarea>
            </div>
            <div>
              <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Presupuesto (USD)</label>
              <input id="prop-budget" type="number" class="input" placeholder="1500">
            </div>
            <button onclick="submitIaProposal()" class="w-full btn-primary">📋 Generar propuesta</button>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-3">
          <p id="prop-count" class="text-sm" style="color:#6B7280;">Cargando...</p>
          <div id="prop-table-wrap" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
            <div class="flex items-center justify-center h-32 text-sm" style="color:#9CA3AF;">Cargando...</div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-sm" style="color:#374151;">Historial de ejecuciones</h2>
              <button onclick="loadAgentRuns('proposal')" class="text-xs transition" style="color:#6B7280;">Actualizar</button>
            </div>
            <div id="runs-table" class="bg-white border overflow-hidden" style="border-color:#E5E7EB;border-radius:8px;">
              <div class="flex items-center justify-center h-24 text-sm" style="color:#9CA3AF;">Cargando...</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  await Promise.all([refreshIaProposals(), loadAgentRuns('proposal')]);
}

function renderIaProposalsTable(rows) {
  if (!rows?.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <p class="text-sm">Sin propuestas IA aún</p>
      <p class="text-xs mt-1">Para brief comercial usá Briefing; el catálogo vive en Menú · Propuestas</p>
    </div>`;
  }

  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Lead</th>
        <th class="text-left px-4 py-3">Resumen</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Actualizado</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r) => {
        const safe = JSON.stringify(r).replace(/'/g, '&#39;');
        const summary = (r.proposal?.investment_range || r.proposal?.services_recommended?.[0] || r.proposal?.raw_response || '').toString().slice(0, 80);
        return `<tr class="data-row transition" style="border-top:1px solid #F3F4F6;cursor:pointer;"
            onclick='openIaProposalModal(${safe})'>
          <td class="px-4 py-3">
            <p class="font-medium text-xs" style="color:#111827;">${r.name || '—'}</p>
            <p class="text-xs" style="color:#9CA3AF;">${r.email || ''}</p>
          </td>
          <td class="px-4 py-3 text-xs truncate max-w-[240px]" style="color:#6B7280;">${summary || '—'}</td>
          <td class="px-4 py-3">${monthlyStatusBadge(r.proposal_status || 'pending_approval')}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(r.updated_at)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function renderIaProposalDetail(lead) {
  const p = lead.proposal || {};
  const list = (arr, empty) =>
    Array.isArray(arr) && arr.length
      ? `<ul class="space-y-1.5">${arr.map((x) => `<li class="text-xs" style="color:#374151;">• ${typeof x === 'string' ? x : JSON.stringify(x)}</li>`).join('')}</ul>`
      : `<p class="text-xs" style="color:#9CA3AF;">${empty}</p>`;

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Lead</p>
        <p style="color:#374151;">${lead.name || '—'} · ${lead.email || ''}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Estado</p>
        <p style="color:#374151;">${lead.proposal_status || '—'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Inversión</p>
        <p style="color:#374151;">${p.investment_range || '—'}</p>
      </div>
    </div>
    <div class="rounded-lg p-3.5 border" style="background:#EFF6FF;border-color:#BFDBFE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#2563EB;">Servicios</p>
      ${list(p.services_recommended, 'Sin servicios')}
    </div>
    <div class="rounded-lg p-3.5 border" style="background:#F0FDF4;border-color:#BBF7D0;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#15803D;">Resultados esperados</p>
      ${list(p.expected_results, '—')}
    </div>
    <div class="rounded-lg p-3.5 border" style="background:#FEF3C7;border-color:#FDE68A;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#B45309;">Próximos pasos</p>
      ${list(p.next_steps, '—')}
    </div>
    ${p.onboarding_plan ? `<div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Onboarding</p>
      <p class="text-xs leading-relaxed" style="color:#374151;">${typeof p.onboarding_plan === 'string' ? p.onboarding_plan : JSON.stringify(p.onboarding_plan)}</p>
    </div>` : ''}
    ${lead.proposal_status === 'pending_approval' ? `
    <button class="btn-primary text-xs" onclick="approveIaProposal('${lead.id}')">Aprobar propuesta</button>` : ''}
  `;
}

async function openIaProposalModal(lead) {
  document.getElementById('modal-name').textContent = lead.name || 'Propuesta IA';
  document.getElementById('modal-source').textContent = lead.proposal_status || '';
  document.getElementById('modal-body').innerHTML = renderIaProposalDetail(lead);
  const footer = document.getElementById('modal-footer');
  if (footer) footer.style.display = 'none';
  document.getElementById('lead-modal').classList.remove('hidden');
}

async function refreshIaProposals() {
  const res = await api('/api/proposals');
  const wrap = document.getElementById('prop-table-wrap');
  const count = document.getElementById('prop-count');
  if (count) count.textContent = `${res?.count || 0} propuestas`;
  if (wrap) wrap.innerHTML = renderIaProposalsTable(res?.proposals || []);
}

async function submitIaProposal() {
  const lead_id = document.getElementById('prop-lead-id')?.value?.trim();
  const call_notes = document.getElementById('prop-notes')?.value || '';
  const budget_estimate = Number(document.getElementById('prop-budget')?.value) || null;
  if (!lead_id) {
    showToast('Lead ID requerido', 'error');
    return;
  }
  showToast('Generando propuesta…');
  const res = await api('/api/proposals', {
    method: 'POST',
    body: { lead_id, call_notes, budget_estimate },
  });
  if (res?.ok) {
    showToast('✓ Propuesta generada');
    refreshIaProposals();
    loadAgentRuns('proposal');
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function approveIaProposal(leadId) {
  const res = await api(`/api/proposals/${leadId}/approve`, { method: 'POST', body: {} });
  if (res?.ok) {
    showToast('Propuesta aprobada');
    refreshIaProposals();
    closeModal();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}
