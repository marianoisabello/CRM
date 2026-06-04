async function renderAgent(root, agentId) {
  const info = agentInfo[agentId] || { emoji: '🤖', name: agentId, desc: '' };

  root.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-2xl">${info.emoji}</div>
        <div>
          <h1 class="text-xl font-semibold">Agente ${info.name}</h1>
          <p class="text-gray-500 text-sm mt-0.5">${info.desc}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-5">
        <!-- Formulario -->
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-sm mb-4 text-gray-300">Ejecutar manualmente</h2>
          ${buildAgentForm(agentId)}
        </div>

        <!-- Historial -->
        <div class="lg:col-span-2">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-sm text-gray-300">Historial de ejecuciones</h2>
            <button onclick="loadAgentRuns('${agentId}')" class="text-xs text-gray-600 hover:text-gray-400 transition">Actualizar</button>
          </div>
          <div id="runs-table" class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div class="flex items-center justify-center h-24 text-gray-600 text-sm">Cargando...</div>
          </div>
        </div>
      </div>
    </div>`;

  await loadAgentRuns(agentId);
}

function buildAgentForm(agentId) {
  const inputCls = 'input';
  const btnCls = 'mt-4 w-full btn-primary';

  switch (agentId) {
    case 'sdr':
      return `<div class="space-y-3">
        <div>
          <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputCls}">
        </div>
        <button onclick="runAgent('sdr')" class="${btnCls}">🎯 Ejecutar SDR</button>
      </div>`;

    case 'analyst':
      return `<div class="space-y-3">
        <div>
          <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputCls}">
        </div>
        <div>
          <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Notas de reunión</label>
          <textarea id="ag-meeting-notes" rows="4" placeholder="Qué se habló en la reunión..." class="${inputCls}" style="resize:vertical"></textarea>
        </div>
        <button onclick="runAgent('analyst')" class="${btnCls}">🔍 Generar diagnóstico</button>
      </div>`;

    case 'proposal':
      return `<div class="space-y-3">
        <div>
          <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Lead ID</label>
          <input id="ag-lead-id" placeholder="uuid del lead" class="${inputCls}">
        </div>
        <div>
          <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Notas de call</label>
          <textarea id="ag-call-notes" rows="3" placeholder="Resumen de la llamada..." class="${inputCls}" style="resize:vertical"></textarea>
        </div>
        <div>
          <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Presupuesto estimado (USD)</label>
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
            <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Desde</label>
            <input id="ag-since" type="date" value="${weekAgo}" class="${inputCls}">
          </div>
          <div>
            <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Hasta</label>
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
          <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Client ID</label>
          <input id="ag-client-id" placeholder="uuid del cliente" class="${inputCls}">
        </div>
        <div>
          <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Mes (YYYY-MM)</label>
          <input id="ag-month" value="${monthStr}" class="${inputCls}">
        </div>
        <div>
          <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Notas del equipo</label>
          <textarea id="ag-team-notes" rows="3" placeholder="Eventos relevantes del mes..." class="${inputCls}" style="resize:vertical"></textarea>
        </div>
        <button onclick="runAgent('reporting')" class="${btnCls}">📊 Generar reporte</button>
      </div>`;
    }

    default:
      return '<p class="text-gray-600 text-sm">Agente no configurado</p>';
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
    setTimeout(() => loadAgentRuns(agentId), 2500);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function loadAgentRuns(agentId) {
  const { runs } = await api(`/api/agent-runs?agent_id=${agentId}&limit=20`);
  const wrap = document.getElementById('runs-table');
  if (!wrap) return;

  if (!runs?.length) {
    wrap.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-gray-700">
      <svg class="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <p class="text-sm">Sin ejecuciones aún</p>
    </div>`;
    return;
  }

  const statusBadge = {
    running:   'bg-yellow-900/40 text-yellow-300 border border-yellow-800/50',
    completed: 'bg-green-900/40 text-green-300 border border-green-800/50',
    failed:    'bg-red-900/40 text-red-300 border border-red-800/50',
  };

  wrap.innerHTML = `<table class="w-full text-sm">
    <thead>
      <tr class="border-b border-gray-800">
        <th class="text-left px-4 py-3">Lead</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Tokens</th>
        <th class="text-left px-4 py-3">Duración</th>
        <th class="text-left px-4 py-3">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${runs.map(r => `<tr class="border-t border-gray-800/50">
        <td class="px-4 py-3">
          <p class="font-medium text-gray-200 leading-tight">${r.leads?.name || '<span class="text-gray-600">Sin nombre</span>'}</p>
          <p class="text-gray-600 text-xs">${r.leads?.source || ''}</p>
        </td>
        <td class="px-4 py-3">
          <span class="badge ${statusBadge[r.status] || 'bg-gray-800 text-gray-500'}">${r.status}</span>
        </td>
        <td class="px-4 py-3 text-gray-500 font-mono text-xs">${r.tokens_used ? r.tokens_used.toLocaleString() : '—'}</td>
        <td class="px-4 py-3 text-gray-500 text-xs">${r.duration_ms ? `${(r.duration_ms/1000).toFixed(1)}s` : '—'}</td>
        <td class="px-4 py-3 text-gray-600 text-xs">${fmtDate(r.created_at)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}
