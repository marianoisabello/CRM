// ─── Constantes compartidas ──────────────────────────────────────────────────
// Badge tones = estilos inline (tokens v0). Usar con: style="${classColors.hot}"

const classColors = {
  hot:         'background:var(--danger-soft);color:var(--danger);border:1px solid rgb(242 114 109 / 0.3)',
  warm:        'background:var(--warning-soft);color:var(--warning);border:1px solid rgb(245 177 76 / 0.3)',
  cold:        'background:var(--info-soft);color:var(--info);border:1px solid rgb(106 166 255 / 0.3)',
  unqualified: 'background:var(--secondary);color:var(--muted-foreground);border:1px solid var(--border)',
};
const classEmoji = { hot: '🔥', warm: '☀️', cold: '❄️', unqualified: '✗' };

const statusColors = {
  new:       'background:var(--info-soft);color:var(--info);border:1px solid rgb(106 166 255 / 0.3)',
  contacted: 'background:var(--accent-soft);color:#a78bfa;border:1px solid rgb(139 92 246 / 0.3)',
  qualified: 'background:var(--success-soft);color:var(--success);border:1px solid rgb(43 212 189 / 0.3)',
  won:       'background:var(--primary-soft);color:var(--primary);border:1px solid rgb(43 212 189 / 0.35)',
  lost:      'background:var(--secondary);color:var(--muted-foreground);border:1px solid var(--border)',
};
const statusInactive = 'background:var(--secondary);color:var(--muted-foreground);border:1px solid var(--border)';
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
  performance: { emoji: '📈', name: 'Performance', desc: 'Analiza métricas multi-canal: Meta, Google, LinkedIn, TikTok, GA4, IG orgánico y WhatsApp.' },
  reporting:   { emoji: '📊', name: 'Reporting',   desc: 'Genera reportes mensuales consolidados multi-canal por cliente.' },
};

// ─── Primitives visuales (v0 → helpers HTML) ─────────────────────────────────
// Etapa B: disponibles para restyle en C–E. No cambian lógica ni fetches.

const avatarPalette = [
  { bg: 'rgb(43 212 189 / 0.18)', fg: '#2bd4bd' },
  { bg: 'rgb(139 92 246 / 0.2)', fg: '#a78bfa' },
  { bg: 'rgb(106 166 255 / 0.18)', fg: '#6aa6ff' },
  { bg: 'rgb(245 177 76 / 0.18)', fg: '#f5b14c' },
  { bg: 'rgb(242 114 109 / 0.18)', fg: '#f2726d' },
  { bg: 'rgb(255 255 255 / 0.1)', fg: '#d4d4e0' },
];

function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colorFromName(name) {
  const s = String(name || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 9973;
  return avatarPalette[hash % avatarPalette.length];
}

/** Label mono uppercase teal — equivalente Eyebrow */
function eyebrow(text, className = '') {
  return `<p class="eyebrow ${className}">${_escHtml(text)}</p>`;
}

/** Título display Instrument Serif — equivalente .display */
function displayTitle(text, className = '') {
  return `<h2 class="display ${className}">${_escHtml(text)}</h2>`;
}

/**
 * Wrapper tipo Surface / card.
 * @param {string} html — contenido interno (ya escapado o markup controlado)
 * @param {{ glow?: boolean, className?: string, padding?: boolean }} [opts]
 */
function surface(html, opts = {}) {
  const glow = opts.glow ? 'gradient-ring' : '';
  const extra = opts.className || '';
  const padStyle = opts.padding === false ? 'padding:0;' : '';
  return `<div class="relative card ${glow} ${extra}" style="${padStyle}">${html}</div>`;
}

/**
 * Estado vacío reutilizable — equivalente EmptyState.
 * actionLabel/actionOnclick opcionales (sin CTAs mock por defecto).
 * @param {{ headline: string, body?: string, iconHtml?: string, actionLabel?: string, actionOnclick?: string, className?: string }} opts
 */
function emptyState(opts = {}) {
  const headline = _escHtml(opts.headline || 'Sin datos');
  const body = opts.body ? `<p class="max-w-xs text-sm leading-relaxed" style="color:var(--muted-foreground);">${_escHtml(opts.body)}</p>` : '';
  const icon = opts.iconHtml || `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0H4"/></svg>`;
  const action = opts.actionLabel
    ? `<button type="button" class="btn-ghost mt-1" ${opts.actionOnclick ? `onclick="${opts.actionOnclick}"` : ''}>${_escHtml(opts.actionLabel)}</button>`
    : '';
  const extra = opts.className || '';
  return `<div class="flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-10 text-center ${extra}"
    style="border:1px dashed var(--border);background:rgb(16 16 24 / 0.5);">
    <span class="grid place-items-center rounded-full" style="width:48px;height:48px;background:var(--primary-soft);color:var(--primary);">${icon}</span>
    <div class="flex flex-col gap-1.5 items-center">
      <p class="display text-xl">${headline}</p>
      ${body}
    </div>
    ${action}
  </div>`;
}

/**
 * Avatar con color derivado del nombre — equivalente Avatar.
 * @param {string} name
 * @param {{ size?: number, className?: string }} [opts]
 */
function avatarHtml(name, opts = {}) {
  const size = opts.size || 28;
  const label = name || '?';
  const { bg, fg } = colorFromName(label);
  const initials = _avatarInitials(label);
  const fontSize = Math.max(10, Math.round(size * 0.36));
  const extra = opts.className || '';
  return `<span aria-hidden="true" title="${_escHtml(label)}" class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none ${extra}"
    style="width:${size}px;height:${size}px;background:${bg};color:${fg};font-size:${fontSize}px;">${_escHtml(initials)}</span>`;
}

/**
 * Confetti visual (Etapa F) — solo UI, no toca estado.
 * @param {{ x?: number, y?: number }} [origin]
 */
async function celebrate(origin) {
  try {
    if (typeof confetti !== 'function') return;
    const colors = ['#2BD4BD', '#8B5CF6', '#6AA6FF', '#FFFFFF'];
    const base = { colors, disableForReducedMotion: true, zIndex: 100 };
    confetti({
      ...base,
      particleCount: 90,
      spread: 70,
      startVelocity: 45,
      origin: origin || { x: 0.5, y: 0.6 },
    });
    setTimeout(() => {
      confetti({
        ...base,
        particleCount: 50,
        spread: 110,
        scalar: 0.8,
        origin: origin || { x: 0.5, y: 0.6 },
      });
    }, 140);
  } catch (_) {}
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function scoreBar(score) {
  if (score === null || score === undefined) {
    return '<span class="font-data text-xs" style="color:var(--muted-foreground);">—</span>';
  }
  // Umbrales de negocio intactos: >=65 / >=40
  const color = score >= 65 ? 'var(--danger)' : score >= 40 ? 'var(--warning)' : 'var(--info)';
  return `<div class="flex items-center gap-1.5">
    <div class="w-14 h-1.5 rounded-full overflow-hidden" style="background:var(--secondary);">
      <div class="h-full rounded-full" style="width:${score}%;background:${color};"></div>
    </div>
    <span class="font-data text-xs tnum" style="color:var(--muted-foreground);">${score}</span>
  </div>`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function classificationBadge(c) {
  if (!c) return '<span class="text-xs" style="color:var(--muted-foreground);">—</span>';
  const style = classColors[c] || classColors.unqualified;
  return `<span class="badge" style="${style}">${classEmoji[c] || ''} ${c}</span>`;
}

function statusBadge(status, opts = {}) {
  const label = statusLabel[status] || status || '—';
  const active = opts.active !== false;
  const style = active && statusColors[status] ? statusColors[status] : statusInactive;
  const extra = opts.className || '';
  const onClick = opts.onclick ? ` onclick="${opts.onclick}"` : '';
  return `<span class="badge ${extra}" style="${style}"${onClick}>${label}</span>`;
}

function _avatarInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

function renderLeadsTable(leads, emptyMsg = 'Sin leads') {
  if (!leads || !leads.length) {
    return emptyState({
      headline: emptyMsg,
      body: 'Cuando entren leads por los canales, aparecen acá.',
      iconHtml: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
    });
  }
  return `<div class="card overflow-hidden" style="padding:0;">
  <table class="w-full text-sm">
    <thead>
      <tr style="border-bottom:1px solid var(--border);">
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
        <tr class="lead-row transition" style="border-top:1px solid var(--border);"
            onclick='openLeadModal(${JSON.stringify(l).replace(/'/g, "&#39;")})'>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2.5">
              ${avatarHtml(l.name || '?', { size: 28 })}
              <div class="min-w-0">
                <p class="font-medium leading-tight" style="color:var(--foreground);">${l.name || '<span style="color:var(--muted-foreground);">Sin nombre</span>'}</p>
                <p class="text-xs mt-0.5 truncate max-w-[140px]" style="color:var(--muted-foreground);">${l.email || l.contact || ''}</p>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-xs" style="color:var(--muted-foreground);">${sourceLabel[l.source] || l.source}</td>
          <td class="px-4 py-3">${scoreBar(l.score)}</td>
          <td class="px-4 py-3">${classificationBadge(l.classification)}</td>
          <td class="px-4 py-3 text-xs" style="color:var(--muted-foreground);">${actionLabel[l.next_action] || '—'}</td>
          <td class="px-4 py-3">${statusBadge(l.status)}</td>
          <td class="px-4 py-3 font-data text-xs" style="color:var(--muted-foreground);">${fmtDate(l.created_at)}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  </div>`;
}

function renderLeadDetail(l) {
  const msgParts = l.message ? l.message.split('|').map(p => p.trim()).filter(Boolean) : [];
  const questions = ['¿En qué los podemos ayudar?', '¿Qué los trajo por acá?'];
  const email = (l.email || '').trim();
  const safeEmail = email.replace(/'/g, "\\'");
  const labelCls = 'text-xs font-semibold mb-1 uppercase tracking-wider';
  const labelStyle = 'color:var(--muted-foreground);font-family:var(--font-mono);letter-spacing:0.14em;';

  return `
    <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <p class="${labelCls}" style="${labelStyle}">Email</p>
        <p style="color:var(--foreground);">${l.email || '<span style="color:var(--muted-foreground);">—</span>'}</p>
      </div>
      <div>
        <p class="${labelCls}" style="${labelStyle}">Contacto</p>
        <p style="color:var(--foreground);">${l.contact || '<span style="color:var(--muted-foreground);">—</span>'}</p>
      </div>
      <div>
        <p class="${labelCls}" style="${labelStyle}">Fuente</p>
        <p style="color:var(--foreground);">${sourceLabel[l.source] || l.source}</p>
      </div>
      <div>
        <p class="${labelCls}" style="${labelStyle}">Score SDR</p>
        <div class="mt-1">${scoreBar(l.score)}</div>
      </div>
      <div>
        <p class="${labelCls}" style="${labelStyle}">Clasificación</p>
        <div class="mt-0.5">${classificationBadge(l.classification)}</div>
      </div>
      <div>
        <p class="${labelCls}" style="${labelStyle}">Próxima acción</p>
        <p class="text-xs" style="color:var(--muted-foreground);">${actionLabel[l.next_action] || '—'}</p>
      </div>
    </div>

    ${msgParts.length ? `
    <div class="rounded-xl p-3.5 border" style="background:var(--elevated);border-color:var(--border);">
      <p class="${labelCls} mb-3" style="${labelStyle}">Conversación</p>
      <div class="space-y-2.5">
        ${msgParts.map((p, i) => `
          <div>
            <p class="text-xs mb-1" style="color:var(--muted-foreground);">${questions[i] || `Respuesta ${i+1}`}</p>
            <p class="text-xs rounded-lg px-3 py-2 leading-relaxed" style="background:var(--card);border:1px solid var(--border);color:var(--foreground);">${p}</p>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${l.sdr_notes ? `
    <div class="rounded-xl p-3.5 border" style="background:var(--info-soft);border-color:rgb(106 166 255 / 0.35);">
      <p class="${labelCls} mb-2" style="color:var(--info);font-family:var(--font-mono);letter-spacing:0.14em;">Análisis SDR</p>
      <p class="whitespace-pre-wrap text-xs leading-relaxed" style="color:var(--foreground);">${l.sdr_notes}</p>
    </div>` : ''}

    <div class="rounded-xl p-3.5 border" style="background:var(--elevated);border-color:var(--border);" id="lead-assign-box">
      <p class="${labelCls} mb-2" style="${labelStyle}">Asignar propuesta (manual)</p>
      ${!email ? `
        <p class="text-xs leading-relaxed" style="color:var(--warning);background:var(--warning-soft);border:1px solid rgb(245 177 76 / 0.35);border-radius:8px;padding:8px 10px;">
          Este lead no tiene email. Agregá un email para asignar una propuesta del catálogo (mismo criterio que Analista).
        </p>
      ` : `
        <p class="text-xs mb-2" style="color:var(--muted-foreground);" id="lead-prop-current">Cargando asignación…</p>
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
    <div class="rounded-xl p-3.5 border" style="background:var(--accent-soft);border-color:rgb(139 92 246 / 0.35);">
      <p class="${labelCls} mb-2" style="color:#a78bfa;font-family:var(--font-mono);letter-spacing:0.14em;">Cadena agentes (02 → 04)</p>
      <p class="text-xs mb-3" style="color:var(--muted-foreground);">Perfil (Analista) → opcional reunión (Reuniones) → briefing comercial. Empezá por el perfil si aún no existe.</p>
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
        currentEl.innerHTML = `Actual: <span style="color:var(--foreground);">${byLead.propuesta.nombre}</span> · origen ${byLead.perfil?.propuesta_origen || '—'}`;
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
