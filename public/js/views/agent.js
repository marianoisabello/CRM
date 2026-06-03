async function renderAgent(root, agentId) {
  const info = agentInfo[agentId] || { emoji: '🤖', name: agentId, desc: '' };

  const formHtml = buildAgentForm(agentId);
  root.innerHTML = `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold">${info.emoji} Agente ${info.name}</h1>
        <p class="text-gray-500 text-sm">${info.desc}</p>
      </div>

      <!-- Formulario de disparo manual -->
      <div class="card max-w-lg">
        <h2 class="font-semibold text-sm mb-4">Ejecutar manualmente</h2>
        ${formHtml}
      </div>

      <!-- Historial -->
      <div>
        <h2 class="font-semibold text-sm mb-3">Historial de ejecuciones</h2>
        <div id="runs-table" class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div class="flex items-center justify-center h-24 text-gray-500">Cargando...</div>
        </div>
      </div>
    </div>`;

  await loadAgentRuns(agentId);
}

function buildAgentForm(agentId) {
  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500';
  const btnClass = 'mt-3 w-full bg-violet-600 hover:bg-violet-500 transition rounded-lg py-2 text-sm font-semibold';

  switch (agentId) {
    case 'sdr':
      return `<div class="space-y-3">
        <div><label class="text-xs text-gray-400 mb-1 block">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputClass}"></div>
        <button onclick="runAgent('sdr')" class="${btnClass}">🎯 Ejecutar SDR</button>
      </div>`;
    case 'analyst':
      return `<div class="space-y-3">
        <div><label class="text-xs text-gray-400 mb-1 block">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputClass}"></div>
        <div><label class="text-xs text-gray-400 mb-1 block">Notas de la reunión</label>
          <textarea id="ag-meeting-notes" rows="3" placeholder="Qué se habló en la reunión..." class="${inputClass}"></textarea></div>
        <button onclick="runAgent('analyst')" class="${btnClass}">🔍 Generar diagnóstico</button>
      </div>`;
    case 'proposal':
      return `<div class="space-y-3">
        <div><label class="text-xs text-gray-400 mb-1 block">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputClass}"></div>
        <div><label class="text-xs text-gray-400 mb-1 block">Notas adicionales</label>
          <textarea id="ag-call-notes" rows="2" placeholder="Notas de la call..." class="${inputClass}"></textarea></div>
        <div><label class="text-xs text-gray-400 mb-1 block">Presupuesto estimado (USD)</label>
          <input id="ag-budget" type="number" placeholder="1000" class="${inputClass}"></div>
        <button onclick="runAgent('proposal')" class="${btnClass}">📋 Generar propuesta</button>
      </div>`;
    case 'performance':
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
      return `<div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-gray-400 mb-1 block">Desde</label>
            <input id="ag-since" type="date" value="${weekAgo}" class="${inputClass}"></div>
          <div><label class="text-xs text-gray-400 mb-1 block">Hasta</label>
            <input id="ag-until" type="date" value="${today}" class="${inputClass}"></div>
        </div>
        <button onclick="runAgent('performance')" class="${btnClass}">📈 Analizar performance</button>
      </div>`;
    case 'reporting':
      const prevMonth = new Date(); prevMonth.setMonth(prevMonth.getMonth() - 1);
      const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;
      return `<div class="space-y-3">
        <div><label class="text-xs text-gray-400 mb-1 block">Client ID</label>
          <input id="ag-client-id" placeholder="uuid del cliente" class="${inputClass}"></div>
        <div><label class="text-xs text-gray-400 mb-1 block">Mes (YYYY-MM)</label>
          <input id="ag-month" value="${monthStr}" class="${inputClass}"></div>
        <div><label class="text-xs text-gray-400 mb-1 block">Notas del equipo</label>
          <textarea id="ag-team-notes" rows="2" placeholder="Eventos relevantes del mes..." class="${inputClass}"></textarea></div>
        <button onclick="runAgent('reporting')" class="${btnClass}">📊 Generar reporte</button>
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
    showToast(`${agentInfo[agentId]?.emoji} ${agentInfo[agentId]?.name} iniciado en background`);
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
    wrap.innerHTML = '<div class="text-center py-8 text-gray-500 text-sm">Sin ejecuciones aún</div>';
    return;
  }

  const statusColor = { running: 'text-yellow-400', completed: 'text-green-400', failed: 'text-red-400' };

  wrap.innerHTML = `<table class="w-full text-sm">
    <thead><tr class="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
      <th class="text-left px-4 py-3">Lead</th>
      <th class="text-left px-4 py-3">Estado</th>
      <th class="text-left px-4 py-3">Tokens</th>
      <th class="text-left px-4 py-3">Duración</th>
      <th class="text-left px-4 py-3">Fecha</th>
    </tr></thead>
    <tbody>
      ${runs.map(r => `<tr class="border-t border-gray-800/60">
        <td class="px-4 py-3">
          <p class="font-medium">${r.leads?.name || 'Sin nombre'}</p>
          <p class="text-gray-500 text-xs">${r.leads?.source || ''}</p>
        </td>
        <td class="px-4 py-3 ${statusColor[r.status] || 'text-gray-400'} font-medium">${r.status}</td>
        <td class="px-4 py-3 text-gray-400 font-mono text-xs">${r.tokens_used || '—'}</td>
        <td class="px-4 py-3 text-gray-400 text-xs">${r.duration_ms ? `${(r.duration_ms/1000).toFixed(1)}s` : '—'}</td>
        <td class="px-4 py-3 text-gray-500 text-xs">${fmtDate(r.created_at)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}
