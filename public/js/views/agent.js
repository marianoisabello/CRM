async function renderAgent(root, agentId) {
  const info = agentInfo[agentId] || { emoji: 'AI', color: 'violet', name: agentId, desc: '' };
  const colorMap = {
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  const formHtml = buildAgentForm(agentId);
  root.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl ${colorMap[info.color] || colorMap.violet} border flex items-center justify-center text-sm font-bold shrink-0">
          ${info.emoji}
        </div>
        <div>
          <h1 class="text-2xl font-semibold text-white">Agente ${info.name}</h1>
          <p class="text-gray-500 text-[13px] mt-1">${info.desc}</p>
        </div>
      </div>

      <!-- Formulario de disparo manual -->
      <div class="card max-w-lg">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-semibold text-[13px] text-white flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Ejecutar manualmente
          </h2>
        </div>
        ${formHtml}
      </div>

      <!-- Historial -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-[13px] text-white flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Historial de ejecuciones
          </h2>
          <button onclick="loadAgentRuns('${agentId}')" class="text-[11px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Actualizar
          </button>
        </div>
        <div id="runs-table" class="bg-gray-900/80 border border-gray-800/80 rounded-xl overflow-hidden">
          <div class="flex items-center justify-center h-24 text-gray-500 text-[13px]">
            <svg class="w-4 h-4 spinning mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Cargando...
          </div>
        </div>
      </div>
    </div>`;

  await loadAgentRuns(agentId);
}

function buildAgentForm(agentId) {
  const inputClass = 'w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-500 focus:border-violet-500 focus:bg-gray-800 transition-colors';
  const labelClass = 'text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block font-medium';
  const btnClass = 'mt-4 w-full bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg py-2.5 text-[13px] font-semibold text-white flex items-center justify-center gap-2';

  switch (agentId) {
    case 'sdr':
      return `<div class="space-y-4">
        <div><label class="${labelClass}">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputClass}"></div>
        <button onclick="runAgent('sdr')" class="${btnClass}">
          <span class="w-5 h-5 rounded bg-red-500/30 flex items-center justify-center text-[9px] font-bold">SDR</span>
          Ejecutar SDR
        </button>
      </div>`;
    case 'analyst':
      return `<div class="space-y-4">
        <div><label class="${labelClass}">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputClass}"></div>
        <div><label class="${labelClass}">Notas de la reunion</label>
          <textarea id="ag-meeting-notes" rows="3" placeholder="Que se hablo en la reunion..." class="${inputClass}"></textarea></div>
        <button onclick="runAgent('analyst')" class="${btnClass}">
          <span class="w-5 h-5 rounded bg-blue-500/30 flex items-center justify-center text-[9px] font-bold">ANL</span>
          Generar diagnostico
        </button>
      </div>`;
    case 'proposal':
      return `<div class="space-y-4">
        <div><label class="${labelClass}">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputClass}"></div>
        <div><label class="${labelClass}">Notas adicionales</label>
          <textarea id="ag-call-notes" rows="2" placeholder="Notas de la call..." class="${inputClass}"></textarea></div>
        <div><label class="${labelClass}">Presupuesto estimado (USD)</label>
          <input id="ag-budget" type="number" placeholder="1000" class="${inputClass}"></div>
        <button onclick="runAgent('proposal')" class="${btnClass}">
          <span class="w-5 h-5 rounded bg-violet-500/30 flex items-center justify-center text-[9px] font-bold">PRO</span>
          Generar propuesta
        </button>
      </div>`;
    case 'performance':
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
      return `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="${labelClass}">Desde</label>
            <input id="ag-since" type="date" value="${weekAgo}" class="${inputClass}"></div>
          <div><label class="${labelClass}">Hasta</label>
            <input id="ag-until" type="date" value="${today}" class="${inputClass}"></div>
        </div>
        <button onclick="runAgent('performance')" class="${btnClass}">
          <span class="w-5 h-5 rounded bg-emerald-500/30 flex items-center justify-center text-[9px] font-bold">PER</span>
          Analizar performance
        </button>
      </div>`;
    case 'reporting':
      const prevMonth = new Date(); prevMonth.setMonth(prevMonth.getMonth() - 1);
      const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;
      return `<div class="space-y-4">
        <div><label class="${labelClass}">Client ID</label>
          <input id="ag-client-id" placeholder="uuid del cliente" class="${inputClass}"></div>
        <div><label class="${labelClass}">Mes (YYYY-MM)</label>
          <input id="ag-month" value="${monthStr}" class="${inputClass}"></div>
        <div><label class="${labelClass}">Notas del equipo</label>
          <textarea id="ag-team-notes" rows="2" placeholder="Eventos relevantes del mes..." class="${inputClass}"></textarea></div>
        <button onclick="runAgent('reporting')" class="${btnClass}">
          <span class="w-5 h-5 rounded bg-amber-500/30 flex items-center justify-center text-[9px] font-bold">REP</span>
          Generar reporte
        </button>
      </div>`;
    default:
      return '<p class="text-gray-500 text-sm">Agente no configurado</p>';
  }
}

async function runAgent(agentId) {
  const body = {};
  const leadId = document.getElementById('ag-lead-id')?.value;
  if (leadId) body.lead_id = leadId;
  if (document.getElementById('ag-meeting-notes')) body.meeting_notes = document.getElementById('ag-meeting-notes').value;
  if (document.getElementById('ag-call-notes')) body.call_notes = document.getElementById('ag-call-notes').value;
  if (document.getElementById('ag-budget')) body.budget_estimate = Number(document.getElementById('ag-budget').value) || null;
  if (document.getElementById('ag-since')) body.since = document.getElementById('ag-since').value;
  if (document.getElementById('ag-until')) body.until = document.getElementById('ag-until').value;
  if (document.getElementById('ag-client-id')) body.client_id = document.getElementById('ag-client-id').value;
  if (document.getElementById('ag-month')) body.month = document.getElementById('ag-month').value;
  if (document.getElementById('ag-team-notes')) body.team_notes = document.getElementById('ag-team-notes').value;

  const res = await api(`/api/agent-runs/${agentId}`, { method: 'POST', body });
  if (res?.ok) {
    showToast(`${agentInfo[agentId]?.name} iniciado en background`);
    setTimeout(() => loadAgentRuns(agentId), 3000);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function loadAgentRuns(agentId) {
  const { runs } = await api(`/api/agent-runs?agent_id=${agentId}&limit=20`);
  const wrap = document.getElementById('runs-table');
  if (!wrap) return;

  if (!runs?.length) {
    wrap.innerHTML = `<div class="text-center py-12 text-gray-500">
      <svg class="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <p class="text-[13px]">Sin ejecuciones aun</p>
    </div>`;
    return;
  }

  const statusStyles = { 
    running: 'bg-amber-500/15 text-amber-400 border border-amber-500/30', 
    completed: 'bg-green-500/15 text-green-400 border border-green-500/30', 
    failed: 'bg-red-500/15 text-red-400 border border-red-500/30' 
  };

  wrap.innerHTML = `<table class="w-full text-[13px]">
    <thead><tr class="border-b border-gray-800/80 text-gray-500 text-[11px] uppercase tracking-wider">
      <th class="text-left px-4 py-3 font-medium">Lead</th>
      <th class="text-left px-4 py-3 font-medium">Estado</th>
      <th class="text-left px-4 py-3 font-medium">Tokens</th>
      <th class="text-left px-4 py-3 font-medium">Duracion</th>
      <th class="text-left px-4 py-3 font-medium">Fecha</th>
    </tr></thead>
    <tbody>
      ${runs.map(r => `<tr class="border-t border-gray-800/50 hover:bg-gray-800/30 transition-colors">
        <td class="px-4 py-3">
          <p class="font-medium text-gray-100">${r.leads?.name || 'Sin nombre'}</p>
          <p class="text-gray-500 text-[11px]">${r.leads?.source ? sourceLabel[r.leads.source] || r.leads.source : ''}</p>
        </td>
        <td class="px-4 py-3">
          <span class="badge ${statusStyles[r.status] || 'bg-gray-500/15 text-gray-400 border border-gray-500/30'} text-[10px] uppercase font-semibold">${r.status}</span>
        </td>
        <td class="px-4 py-3 text-gray-400 font-mono text-[11px] tabular-nums">${r.tokens_used || '-'}</td>
        <td class="px-4 py-3 text-gray-400 text-[11px] tabular-nums">${r.duration_ms ? `${(r.duration_ms/1000).toFixed(1)}s` : '-'}</td>
        <td class="px-4 py-3 text-gray-500 text-[11px] tabular-nums">${fmtDate(r.created_at)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}
