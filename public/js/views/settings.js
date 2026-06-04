function renderSettings(root) {
  const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
  const initial = (user.name || user.email || 'A')[0].toUpperCase();

  root.innerHTML = `
    <div class="space-y-6 max-w-2xl">
      <!-- Header -->
      <div>
        <h1 class="text-xl font-semibold">Configuración</h1>
        <p class="text-gray-500 text-sm mt-0.5">Usuarios e integraciones del sistema</p>
      </div>

      <!-- Usuario actual -->
      <div class="card">
        <h2 class="font-semibold text-sm mb-4 text-gray-300">Tu cuenta</h2>
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-base font-bold shrink-0">
            ${initial}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-100">${user.name || '—'}</p>
            <p class="text-gray-500 text-sm truncate">${user.email || '—'}</p>
          </div>
          <span class="badge bg-violet-900/40 text-violet-300 border border-violet-800/60">${user.role || 'admin'}</span>
        </div>
      </div>

      <!-- Crear usuario -->
      <div class="card">
        <h2 class="font-semibold text-sm mb-4 text-gray-300">Crear usuario admin</h2>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Nombre</label>
            <input id="new-name" placeholder="Nombre completo" class="input">
          </div>
          <div>
            <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Email</label>
            <input id="new-email" type="email" placeholder="email@pampai.com" class="input">
          </div>
          <div>
            <label class="text-xs text-gray-600 font-medium mb-1.5 block uppercase tracking-wider">Contraseña</label>
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
        <h2 class="font-semibold text-sm mb-4 text-gray-300">Integraciones</h2>
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
  return `<div class="flex items-center justify-between py-3 border-b border-gray-800/40 last:border-0">
    <div class="flex items-center gap-3">
      <div class="w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-green-400' : 'bg-gray-700'}"></div>
      <div>
        <p class="text-sm font-medium text-gray-200">${name}</p>
        <p class="text-xs text-gray-600">${note}</p>
      </div>
    </div>
    <span class="text-xs font-medium px-2.5 py-1 rounded-lg ${active
      ? 'bg-green-900/30 text-green-400 border border-green-800/40'
      : 'bg-gray-800/60 text-gray-600 border border-gray-700/40'}">
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
    msg.className = 'text-sm text-red-400';
    msg.classList.remove('hidden');
    return;
  }

  const res = await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
  if (res?.ok) {
    msg.textContent = '✓ Usuario creado';
    msg.className = 'text-sm text-green-400';
    ['new-name','new-email','new-password'].forEach(id => document.getElementById(id).value = '');
    showToast('Usuario creado correctamente');
  } else {
    msg.textContent = res?.error || 'Error creando usuario';
    msg.className = 'text-sm text-red-400';
  }
  msg.classList.remove('hidden');
}
