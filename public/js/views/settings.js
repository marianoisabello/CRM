function renderSettings(root) {
  const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
  const initial = (user.name || user.email || 'A')[0].toUpperCase();

  root.innerHTML = `
    <div class="space-y-5 max-w-2xl">
      <div>
        <h1 class="text-xl font-semibold" style="color:#111827;">Configuración</h1>
        <p class="text-sm mt-0.5" style="color:#6B7280;">Usuarios e integraciones del sistema</p>
      </div>

      <!-- Usuario actual -->
      <div class="card">
        <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Tu cuenta</h2>
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0 text-white" style="background:#2563EB;">
            ${initial}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium" style="color:#111827;">${user.name || '—'}</p>
            <p class="text-sm truncate" style="color:#6B7280;">${user.email || '—'}</p>
          </div>
          <span class="badge bg-blue-100 text-blue-700 border border-blue-200">${user.role || 'admin'}</span>
        </div>
      </div>

      <!-- Integraciones / Reuniones -->
      <div class="card">
        <div class="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 class="font-semibold text-sm" style="color:#374151;">Integraciones · Reuniones</h2>
            <p class="text-xs mt-1" style="color:#9CA3AF;">Zoom, Google Meet y WhatsApp para el Agente 03. Sync vía OAuth o webhooks.</p>
          </div>
          <button onclick="refreshMeetingIntegrations()" class="btn-ghost text-xs shrink-0">Actualizar</button>
        </div>
        <div id="reuniones-integrations" class="space-y-3">
          <p class="text-sm" style="color:#9CA3AF;">Cargando...</p>
        </div>
        <p class="text-xs mt-4 leading-relaxed" style="color:#9CA3AF;">
          Sin keys en Vercel, Connect queda deshabilitado — igual podés subir transcripts en
          <a href="#agent/reuniones" class="underline" style="color:#2563EB;">Agentes → Reuniones</a>
          o pegar webhooks a <code>/api/hooks/reuniones/*</code>.
        </p>
      </div>

      <!-- Integraciones / Performance multi-canal -->
      <div class="card">
        <div class="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 class="font-semibold text-sm" style="color:#374151;">Integraciones · Performance</h2>
            <p class="text-xs mt-1" style="color:#9CA3AF;">Fuentes de métricas para Agente Performance / Reporting. Stubs hasta conectar env en Vercel.</p>
          </div>
          <button onclick="refreshPerformanceIntegrations()" class="btn-ghost text-xs shrink-0">Actualizar</button>
        </div>
        <div id="performance-integrations" class="space-y-3">
          <p class="text-sm" style="color:#9CA3AF;">Cargando...</p>
        </div>
        <p class="text-xs mt-4 leading-relaxed" style="color:#9CA3AF;">
          Sin keys, el análisis usa métricas DEMO. Ver
          <a href="#agent/performance" class="underline" style="color:#2563EB;">Agentes → Performance</a>.
        </p>
      </div>

      <!-- Crear usuario -->
      <div class="card">
        <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Crear usuario admin</h2>
        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Nombre</label>
            <input id="new-name" placeholder="Nombre completo" class="input">
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Email</label>
            <input id="new-email" type="email" placeholder="email@pampai.com" class="input">
          </div>
          <div>
            <label class="text-xs font-semibold mb-1.5 block uppercase tracking-wider" style="color:#9CA3AF;">Contraseña</label>
            <input id="new-password" type="password" placeholder="Mínimo 8 caracteres" class="input">
          </div>
          <div class="flex items-center gap-3 pt-1">
            <button onclick="createUser()" class="btn-primary">Crear usuario</button>
            <p id="create-msg" class="text-sm hidden"></p>
          </div>
        </div>
      </div>

      <!-- Integraciones sistema -->
      <div class="card">
        <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Integraciones del sistema</h2>
        <div class="space-y-1">
          ${renderIntegration('Supabase',          true,  'Base de datos · PostgreSQL')}
          ${renderIntegration('Anthropic Claude',  true,  'Agentes IA · claude-opus-4-6')}
          ${renderIntegration('Google Calendar',   true,  'Reuniones con Meet automático')}
          ${renderIntegration('Google Sheets',     true,  'Export de leads')}
          ${renderIntegration('ManyChat',          true,  'Canal WhatsApp / Instagram')}
          ${renderIntegration('Meta Ads',          false, 'Pendiente — META_ADS_*')}
          ${renderIntegration('Google Ads',        false, 'Pendiente — GOOGLE_ADS_*')}
          ${renderIntegration('LinkedIn / TikTok / GA4', false, 'Stubs multi-canal — ver card Performance')}
        </div>
      </div>
    </div>`;

  refreshMeetingIntegrations();
  refreshPerformanceIntegrations();
}

function renderIntegration(name, active, note) {
  return `<div class="flex items-center justify-between py-3" style="border-bottom:1px solid #F3F4F6;">
    <div class="flex items-center gap-3">
      <div class="w-2 h-2 rounded-full shrink-0" style="background:${active ? '#10B981' : '#D1D5DB'};"></div>
      <div>
        <p class="text-sm font-medium" style="color:#111827;">${name}</p>
        <p class="text-xs" style="color:#9CA3AF;">${note}</p>
      </div>
    </div>
    <span class="text-xs font-semibold px-2.5 py-1 rounded-lg" style="${active
      ? 'background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0;'
      : 'background:#F9FAFB;color:#9CA3AF;border:1px solid #E5E7EB;'}">
      ${active ? 'Activo' : 'Inactivo'}
    </span>
  </div>`;
}

const REUNIONES_PROVIDER_META = {
  zoom: { name: 'Zoom', blurb: 'Grabaciones y transcripts vía OAuth o webhook' },
  google_meet: { name: 'Google Meet', blurb: 'Calls de Calendar / Meet' },
  whatsapp: { name: 'WhatsApp', blurb: 'Chats Whapi (webhook aparte del SDR)' },
};

function statusPill(status) {
  const map = {
    connected: { label: 'Conectado', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
    pending_config: { label: 'Configurar en Vercel', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
    disconnected: { label: 'Desconectado', bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
    error: { label: 'Error', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  };
  const s = map[status] || map.disconnected;
  return `<span class="text-xs font-semibold px-2.5 py-1 rounded-lg" style="background:${s.bg};color:${s.color};border:1px solid ${s.border};">${s.label}</span>`;
}

function renderMeetingIntegrationCard(integ) {
  const meta = REUNIONES_PROVIDER_META[integ.provider] || { name: integ.provider, blurb: '' };
  const connected = integ.status === 'connected';
  const canOauth = integ.can_oauth;
  const webhook = integ.setup?.webhook || '';

  let actions = '';
  if (connected) {
    actions = `<button onclick="disconnectMeetingIntegration('${integ.provider}')" class="btn-ghost text-xs">Desconectar</button>`;
  } else if (canOauth) {
    actions = `<button onclick="connectMeetingIntegration('${integ.provider}')" class="btn-primary text-xs">Conectar</button>`;
  } else {
    actions = `
      <button disabled class="btn-ghost text-xs opacity-50 cursor-not-allowed" title="Faltan credenciales en Vercel">Conectar</button>
      <button onclick="markMeetingIntegrationConnected('${integ.provider}')" class="btn-ghost text-xs">Marcar webhook listo</button>`;
  }

  const steps = (integ.setup?.steps || []).map((s) => `<li class="text-xs leading-relaxed" style="color:#6B7280;">${s}</li>`).join('');

  return `<div class="rounded-lg border p-4" style="border-color:#E5E7EB;background:#FAFAFA;">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm font-semibold" style="color:#111827;">${meta.name}</p>
          ${statusPill(integ.status)}
        </div>
        <p class="text-xs mt-1" style="color:#9CA3AF;">${meta.blurb}</p>
        ${integ.external_account ? `<p class="text-xs mt-1" style="color:#374151;">Cuenta: ${integ.external_account}</p>` : ''}
        ${integ.last_sync_at ? `<p class="text-xs mt-0.5" style="color:#9CA3AF;">Último sync: ${fmtDate(integ.last_sync_at)}</p>` : ''}
        ${integ.last_error ? `<p class="text-xs mt-1" style="color:#B91C1C;">${integ.last_error}</p>` : ''}
      </div>
      <div class="flex flex-col gap-1.5 items-end shrink-0">${actions}</div>
    </div>
    ${!canOauth || integ.status !== 'connected' ? `
    <details class="mt-3">
      <summary class="text-xs cursor-pointer font-medium" style="color:#2563EB;">Cómo configurar</summary>
      <ul class="mt-2 space-y-1 list-disc pl-4">${steps}</ul>
      ${webhook ? `<p class="text-xs mt-2 font-data" style="color:#6B7280;">Webhook: <code>${webhook}</code></p>` : ''}
    </details>` : ''}
  </div>`;
}

async function refreshMeetingIntegrations() {
  const wrap = document.getElementById('reuniones-integrations');
  if (!wrap) return;
  const res = await api('/api/integrations/reuniones');
  if (!res?.ok) {
    wrap.innerHTML = `<p class="text-sm" style="color:#B91C1C;">${res?.error || 'No se pudieron cargar integraciones (¿tabla user_integrations creada?)'}</p>`;
    return;
  }
  wrap.innerHTML = (res.integrations || []).map(renderMeetingIntegrationCard).join('');
}

function renderPerformanceIntegrationCard(integ) {
  const ready = integ.env_ready;
  const steps = (integ.setup?.steps || []).map((s) => `<li class="text-xs leading-relaxed" style="color:#6B7280;">${s}</li>`).join('');
  const vars = (integ.env_vars || []).map((v) => `<code class="text-xs">${v}</code>`).join(' · ');

  return `<div class="rounded-lg border p-4" style="border-color:#E5E7EB;background:#FAFAFA;">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm font-semibold" style="color:#111827;">${integ.label}</p>
          ${statusPill(integ.status)}
        </div>
        <p class="text-xs mt-1" style="color:#9CA3AF;">${integ.blurb || ''}</p>
        <p class="text-xs mt-1.5" style="color:#6B7280;">Env: ${vars || '—'}</p>
      </div>
      <span class="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0" style="${ready
        ? 'background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;'
        : 'background:#F9FAFB;color:#9CA3AF;border:1px solid #E5E7EB;'}">
        ${ready ? 'Env listo' : 'Sin keys'}
      </span>
    </div>
    <details class="mt-3">
      <summary class="text-xs cursor-pointer font-medium" style="color:#2563EB;">Cómo configurar</summary>
      <ul class="mt-2 space-y-1 list-disc pl-4">${steps}</ul>
    </details>
  </div>`;
}

async function refreshPerformanceIntegrations() {
  const wrap = document.getElementById('performance-integrations');
  if (!wrap) return;
  const res = await api('/api/integrations/performance');
  if (!res?.ok) {
    wrap.innerHTML = `<p class="text-sm" style="color:#B91C1C;">${res?.error || 'No se pudieron cargar fuentes'}</p>`;
    return;
  }
  wrap.innerHTML = (res.integrations || []).map(renderPerformanceIntegrationCard).join('');
}

async function connectMeetingIntegration(provider) {
  const res = await api(`/api/integrations/oauth/${provider}/start`);
  if (res?.ok && res.url) {
    window.location.href = res.url;
    return;
  }
  showToast(res?.error || 'OAuth no disponible — configurá keys en Vercel', 'error');
  if (res?.setup?.steps) {
    console.info('Setup', provider, res.setup);
  }
}

async function disconnectMeetingIntegration(provider) {
  const res = await api(`/api/integrations/reuniones/${provider}/disconnect`, { method: 'POST', body: {} });
  if (res?.ok) {
    showToast('Desconectado');
    refreshMeetingIntegrations();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function markMeetingIntegrationConnected(provider) {
  const res = await api(`/api/integrations/reuniones/${provider}/mark-connected`, {
    method: 'POST',
    body: { external_account: 'webhook' },
  });
  if (res?.ok) {
    showToast('Marcado como listo (webhook)');
    refreshMeetingIntegrations();
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function createUser() {
  const name     = document.getElementById('new-name').value;
  const email    = document.getElementById('new-email').value;
  const password = document.getElementById('new-password').value;
  const msg      = document.getElementById('create-msg');

  if (!email || !password) {
    msg.textContent = 'Email y contraseña son requeridos';
    msg.style.color = '#EF4444';
    msg.classList.remove('hidden');
    return;
  }

  const res = await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
  if (res?.ok) {
    msg.textContent = '✓ Usuario creado';
    msg.style.color = '#10B981';
    ['new-name','new-email','new-password'].forEach(id => document.getElementById(id).value = '');
    showToast('Usuario creado correctamente');
  } else {
    msg.textContent = res?.error || 'Error creando usuario';
    msg.style.color = '#EF4444';
  }
  msg.classList.remove('hidden');
}
