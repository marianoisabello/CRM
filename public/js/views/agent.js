async function renderAgent(root, agentId) {
  const info = agentInfo[agentId] || { emoji: '🤖', name: agentId, desc: '' };
  const agentColors = {
    sdr: '#2563EB', analyst: '#7C3AED', proposal: '#0EA5E9',
    performance: '#10B981', reporting: '#F59E0B',
  };
  const accentColor = agentColors[agentId] || '#2563EB';

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
          <p class="text-xs" style="color:#9CA3AF;">${r.leads?.source || ''}</p>
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
