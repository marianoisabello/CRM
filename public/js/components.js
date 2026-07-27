// ─── Constantes compartidas ──────────────────────────────────────────────────

const classColors = {
  hot:         'bg-red-100 text-red-700 border border-red-200',
  warm:        'bg-amber-100 text-amber-700 border border-amber-200',
  cold:        'bg-blue-100 text-blue-700 border border-blue-200',
  unqualified: 'bg-gray-100 text-gray-500 border border-gray-200',
};
const classEmoji = { hot: '🔥', warm: '☀️', cold: '❄️', unqualified: '✗' };

const statusColors = {
  new:       'bg-blue-100 text-blue-700 border border-blue-200',
  contacted: 'bg-sky-100 text-sky-700 border border-sky-200',
  qualified: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  won:       'bg-green-100 text-green-700 border border-green-200',
  lost:      'bg-gray-100 text-gray-500 border border-gray-200',
};
const statusLabel = {
  new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado', won: 'Ganado', lost: 'Perdido',
};

const sourceLabel = {
  web_form:        '🌐 Formulario web',
  manychat:        '💬 ManyChat',
  instagram:       '📸 Instagram',
  whatsapp:        '📱 WhatsApp',
  linkedin:        '💼 LinkedIn',
  email:           '✉️ Email',
  database_import: '📂 Importación',
};

const actionLabel = {
  schedule_meeting: '📅 Agendar reunión',
  send_info:        '📄 Enviar info',
  nurture:          '🌱 Nutrir',
  discard:          '🗑️ Descartar',
};

const agentInfo = {
  sdr:         { emoji: '🎯', name: 'SDR',         desc: 'Califica leads automáticamente con score determinístico y análisis IA.' },
  analyst:     { emoji: '🔍', name: 'Analista',    desc: 'Enriquece leads calificados y guarda perfiles con score, pain points y oferta.' },
  reuniones:   { emoji: '🎙️', name: 'Reuniones',   desc: 'Analiza transcripts de Zoom, Meet o WhatsApp: resumen, pain points, score de cierre.' },
  briefing:    { emoji: '📝', name: 'Briefing',    desc: 'Cruza perfil + reunión + catálogo y genera un brief comercial listo para revisar.' },
  proposal:    { emoji: '📋', name: 'Propuestas',  desc: 'Crea propuestas comerciales personalizadas para el lead.' },
  performance: { emoji: '📈', name: 'Performance', desc: 'Analiza métricas de Meta Ads y Google Ads semanalmente.' },
  reporting:   { emoji: '📊', name: 'Reporting',   desc: 'Genera reportes mensuales consolidados por cliente.' },
};

// ─── Componentes ─────────────────────────────────────────────────────────────

function scoreBar(score) {
  if (score === null || score === undefined) return '<span class="font-data text-xs" style="color:#9CA3AF;">—</span>';
  const color = score >= 65 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#3B82F6';
  return `<div class="flex items-center gap-1.5">
    <div class="w-14 h-1.5 rounded-full overflow-hidden" style="background:#F3F4F6;">
      <div class="h-full rounded-full" style="width:${score}%;background:${color};"></div>
    </div>
    <span class="font-data text-xs tabular-nums" style="color:#6B7280;">${score}</span>
  </div>`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function classificationBadge(c) {
  if (!c) return '<span class="text-xs" style="color:#9CA3AF;">—</span>';
  return `<span class="badge ${classColors[c]}">${classEmoji[c]} ${c}</span>`;
}

function _avatarInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

function renderLeadsTable(leads, emptyMsg = 'Sin leads') {
  if (!leads || !leads.length) {
    return `<div class="flex flex-col items-center justify-center py-16" style="color:#9CA3AF;">
      <svg class="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      <p class="text-sm">${emptyMsg}</p>
    </div>`;
  }
  return `<table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid #E5E7EB;">
        <th class="text-left px-4 py-3">Lead</th>
        <th class="text-left px-4 py-3">Fuente</th>
        <th class="text-left px-4 py-3">Score</th>
        <th class="text-left px-4 py-3">Clasificación</th>
        <th class="text-left px-4 py-3">Acción</th>
        <th class="text-left px-4 py-3">Estado</th>
        <th class="text-left px-4 py-3">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${leads.map(l => `
        <tr class="lead-row transition" style="border-top:1px solid #F3F4F6;"
            onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style="background:#EFF6FF;color:#2563EB;">${_avatarInitials(l.name)}</div>
              <div class="min-w-0">
                <p class="font-medium leading-tight" style="color:#111827;">${l.name || '<span style="color:#9CA3AF;">Sin nombre</span>'}</p>
                <p class="text-xs mt-0.5 truncate max-w-[140px]" style="color:#9CA3AF;">${l.email || l.contact || ''}</p>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-xs" style="color:#6B7280;">${sourceLabel[l.source] || l.source}</td>
          <td class="px-4 py-3">${scoreBar(l.score)}</td>
          <td class="px-4 py-3">${classificationBadge(l.classification)}</td>
          <td class="px-4 py-3 text-xs" style="color:#6B7280;">${actionLabel[l.next_action] || '—'}</td>
          <td class="px-4 py-3"><span class="badge ${statusColors[l.status] || 'bg-gray-100 text-gray-500'}">${statusLabel[l.status] || l.status}</span></td>
          <td class="px-4 py-3 font-data text-xs" style="color:#9CA3AF;">${fmtDate(l.created_at)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderLeadDetail(l) {
  const msgParts = l.message ? l.message.split('|').map(p => p.trim()).filter(Boolean) : [];
  const questions = ['¿En qué los podemos ayudar?', '¿Qué los trajo por acá?'];
  const email = (l.email || '').trim();
  const safeEmail = email.replace(/'/g, "\\'");

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Email</p>
        <p style="color:#374151;">${l.email || '<span style="color:#9CA3AF;">—</span>'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Contacto</p>
        <p style="color:#374151;">${l.contact || '<span style="color:#9CA3AF;">—</span>'}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Fuente</p>
        <p style="color:#374151;">${sourceLabel[l.source] || l.source}</p>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Score SDR</p>
        <div class="mt-1">${scoreBar(l.score)}</div>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Clasificación</p>
        <div class="mt-0.5">${classificationBadge(l.classification)}</div>
      </div>
      <div>
        <p class="text-xs font-semibold mb-1 uppercase tracking-wider" style="color:#9CA3AF;">Próxima acción</p>
        <p class="text-xs" style="color:#6B7280;">${actionLabel[l.next_action] || '—'}</p>
      </div>
    </div>

    ${msgParts.length ? `
    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-3" style="color:#9CA3AF;">Conversación</p>
      <div class="space-y-2.5">
        ${msgParts.map((p, i) => `
          <div>
            <p class="text-xs mb-1" style="color:#9CA3AF;">${questions[i] || `Respuesta ${i+1}`}</p>
            <p class="text-xs rounded-lg px-3 py-2 leading-relaxed" style="background:white;border:1px solid #E5E7EB;color:#374151;">${p}</p>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${l.sdr_notes ? `
    <div class="rounded-lg p-3.5 border" style="background:#EFF6FF;border-color:#BFDBFE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#2563EB;">Análisis SDR</p>
      <p class="whitespace-pre-wrap text-xs leading-relaxed" style="color:#1E40AF;">${l.sdr_notes}</p>
    </div>` : ''}

    <div class="rounded-lg p-3.5 border" style="background:#F9FAFB;border-color:#E5E7EB;" id="lead-assign-box">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#9CA3AF;">Asignar propuesta (manual)</p>
      ${!email ? `
        <p class="text-xs leading-relaxed" style="color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:8px 10px;">
          Este lead no tiene email. Agregá un email para asignar una propuesta del catálogo (mismo criterio que Analista).
        </p>
      ` : `
        <p class="text-xs mb-2" style="color:#6B7280;" id="lead-prop-current">Cargando asignación…</p>
        <select id="lead-prop-select" class="input text-sm mb-2">
          <option value="">Cargando catálogo…</option>
        </select>
        <input id="lead-prop-notas" class="input text-sm mb-2" placeholder="Notas (opcional)">
        <div class="flex gap-2">
          <button type="button" class="btn-primary text-xs" onclick="saveLeadPropuesta('${safeEmail}')">Guardar asignación</button>
          <button type="button" class="btn-ghost text-xs" id="lead-prop-clear" style="display:none;" onclick="clearLeadPropuesta('${safeEmail}')">Quitar</button>
        </div>
      `}
    </div>

    ${email ? `
    <div class="rounded-lg p-3.5 border" style="background:#F5F3FF;border-color:#DDD6FE;">
      <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#7C3AED;">Cadena agentes (02 → 04)</p>
      <p class="text-xs mb-3" style="color:#6B7280;">Perfil (Analista) → opcional reunión (Reuniones) → briefing comercial. Empezá por el perfil si aún no existe.</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-ghost text-xs" onclick="generatePerfilFromLead('${safeEmail}')">Generar perfil</button>
        <button type="button" class="btn-primary text-xs" onclick="generateBriefingFromLead('${safeEmail}')">Generar briefing</button>
        <a href="#agent/analyst" class="btn-ghost text-xs" style="text-decoration:none;" onclick="closeModal()">Ver Analista</a>
        <a href="#agent/briefing" class="btn-ghost text-xs" style="text-decoration:none;" onclick="closeModal()">Ver Briefings</a>
      </div>
    </div>` : ''}`;
}

async function initLeadPropuestaAssign(lead) {
  const email = (lead?.email || '').trim().toLowerCase();
  if (!email) return;

  const currentEl = document.getElementById('lead-prop-current');
  const sel = document.getElementById('lead-prop-select');
  const notasEl = document.getElementById('lead-prop-notas');
  const clearBtn = document.getElementById('lead-prop-clear');
  if (!sel) return;

  let selectedId = null;
  try {
    const byLead = await api(`/api/propuestas/by-lead/${encodeURIComponent(email)}`);
    if (byLead?.propuesta) {
      selectedId = byLead.propuesta.id;
      if (currentEl) {
        currentEl.innerHTML = `Actual: <span style="color:#111827;">${byLead.propuesta.nombre}</span> · origen ${byLead.perfil?.propuesta_origen || '—'}`;
      }
      if (notasEl) notasEl.value = byLead.perfil?.propuesta_notas || '';
      if (clearBtn) clearBtn.style.display = '';
    } else if (currentEl) {
      currentEl.textContent = byLead?.perfil
        ? 'Actual: ninguna'
        : 'Sin perfil Analista aún — al guardar se requiere perfil enriquecido.';
    }
  } catch (_) {
    if (currentEl) currentEl.textContent = 'Actual: —';
  }

  const res = await api('/api/propuestas?activo=true&limit=100');
  const rows = res?.propuestas || [];
  if (!rows.length) {
    sel.innerHTML = '<option value="">Sin propuestas (creá en Menú · Propuestas)</option>';
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

async function saveLeadPropuesta(email) {
  const propuesta_id = document.getElementById('lead-prop-select')?.value;
  const notas = document.getElementById('lead-prop-notas')?.value || '';
  if (!email) {
    showToast('El lead no tiene email; no se puede asignar', 'error');
    return;
  }
  if (!propuesta_id) {
    showToast('Elegí una propuesta del catálogo', 'error');
    return;
  }
  const lead_id = window._currentLead?.id || null;
  const res = await api('/api/propuestas/assign', {
    method: 'POST',
    body: { email, propuesta_id, origen: 'manual', notas, lead_id },
  });
  if (res?.ok) {
    showToast(res.message || 'Propuesta asignada');
    closeModal();
    if (typeof refreshLeads === 'function') refreshLeads();
  } else {
    showToast(res?.error || 'Error al asignar', 'error');
  }
}

async function clearLeadPropuesta(email) {
  if (!email) {
    showToast('El lead no tiene email', 'error');
    return;
  }
  const res = await api('/api/propuestas/assign', {
    method: 'DELETE',
    body: { email },
  });
  if (res?.ok) {
    showToast('Asignación quitada');
    closeModal();
    if (typeof refreshLeads === 'function') refreshLeads();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function generatePerfilFromLead(email) {
  if (!email) {
    showToast('El lead no tiene email', 'error');
    return;
  }
  showToast('Enriqueciendo perfil…');
  const lead_id = window._currentLead?.id || null;
  const res = await api('/api/agent-runs/perfiles/one', {
    method: 'POST',
    body: { email, lead_id },
  });
  if (res?.ok) {
    showToast('✓ Perfil listo');
    closeModal();
    window.location.hash = '#agent/analyst';
  } else {
    showToast(res?.error || 'Error generando perfil', 'error');
  }
}

async function generateBriefingFromLead(email) {
  if (!email) {
    showToast('El lead no tiene email', 'error');
    return;
  }
  showToast('Generando briefing…');
  const lead_id = window._currentLead?.id || null;
  const res = await api('/api/agent-runs/briefings', {
    method: 'POST',
    body: { email, lead_id, force: true },
  });
  if (res?.ok) {
    showToast('✓ Briefing generado (DRAFT)');
    closeModal();
    window.location.hash = '#agent/briefing';
  } else {
    showToast(res?.error || 'Error generando briefing', 'error');
  }
}
