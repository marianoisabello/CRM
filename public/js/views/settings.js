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

      <!-- Integraciones -->
      <div class="card">
        <h2 class="font-semibold text-sm mb-4" style="color:#374151;">Integraciones</h2>
        <div class="space-y-1">
          ${renderIntegration('Supabase',          true,  'Base de datos · PostgreSQL')}
          ${renderIntegration('Anthropic Claude',  true,  'Agentes IA · claude-opus-4-6')}
          ${renderIntegration('Google Calendar',   true,  'Reuniones con Meet automático')}
          ${renderIntegration('Google Sheets',     true,  'Export de leads')}
          ${renderIntegration('ManyChat',          true,  'Canal WhatsApp / Instagram')}
          ${renderIntegration('Meta Ads',          false, 'Pendiente configuración')}
          ${renderIntegration('Google Ads',        false, 'Pendiente configuración')}
        </div>
      </div>
    </div>`;
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
