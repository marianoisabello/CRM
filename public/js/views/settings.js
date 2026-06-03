function renderSettings(root) {
  const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
  root.innerHTML = `
    <div class="space-y-6 max-w-2xl">
      <div>
        <h1 class="text-2xl font-bold">⚙️ Configuración</h1>
        <p class="text-gray-500 text-sm">Gestión de usuarios y ajustes del sistema</p>
      </div>

      <!-- Usuario actual -->
      <div class="card">
        <h2 class="font-semibold text-sm mb-4">Usuario actual</h2>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-lg font-bold">
            ${(user.name || user.email || 'A')[0].toUpperCase()}
          </div>
          <div>
            <p class="font-medium">${user.name || '—'}</p>
            <p class="text-gray-400 text-sm">${user.email || '—'}</p>
            <span class="badge bg-violet-900/50 text-violet-300 border border-violet-800 mt-1 inline-block">${user.role || 'admin'}</span>
          </div>
        </div>
      </div>

      <!-- Crear usuario admin -->
      <div class="card">
        <h2 class="font-semibold text-sm mb-4">Crear nuevo usuario admin</h2>
        <div class="space-y-3">
          <div><label class="text-xs text-gray-400 mb-1 block">Nombre</label>
            <input id="new-name" placeholder="Nombre completo" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"></div>
          <div><label class="text-xs text-gray-400 mb-1 block">Email</label>
            <input id="new-email" type="email" placeholder="email@ejemplo.com" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"></div>
          <div><label class="text-xs text-gray-400 mb-1 block">Password</label>
            <input id="new-password" type="password" placeholder="Mínimo 8 caracteres" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"></div>
          <button onclick="createUser()" class="bg-violet-600 hover:bg-violet-500 transition px-4 py-2 rounded-lg text-sm font-semibold">
            Crear usuario
          </button>
          <p id="create-msg" class="text-sm hidden"></p>
        </div>
      </div>

      <!-- Estado integraciones -->
      <div class="card">
        <h2 class="font-semibold text-sm mb-4">Estado de integraciones</h2>
        <div class="space-y-3">
          ${renderIntegration('Supabase', true, 'Base de datos conectada')}
          ${renderIntegration('Anthropic Claude', true, 'Agentes IA activos')}
          ${renderIntegration('ManyChat', true, 'Canal WhatsApp / Instagram')}
          ${renderIntegration('Google Sheets', false, 'Configurar GOOGLE_SHEETS_SA_KEY')}
          ${renderIntegration('Calendly', false, 'Configurar CALENDLY_TOKEN')}
          ${renderIntegration('Meta Ads', false, 'Configurar META_ADS_ACCESS_TOKEN')}
          ${renderIntegration('Google Ads', false, 'Configurar GOOGLE_ADS_*')}
        </div>
      </div>
    </div>`;
}

function renderIntegration(name, active, note) {
  return `<div class="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
    <div>
      <p class="text-sm font-medium">${name}</p>
      <p class="text-xs text-gray-500">${note}</p>
    </div>
    <span class="text-xs font-semibold px-2 py-1 rounded-full ${active ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-500 border border-gray-700'}">
      ${active ? '● Activo' : '○ Inactivo'}
    </span>
  </div>`;
}

async function createUser() {
  const name = document.getElementById('new-name').value;
  const email = document.getElementById('new-email').value;
  const password = document.getElementById('new-password').value;
  const msg = document.getElementById('create-msg');

  if (!email || !password) { msg.textContent = 'Email y password son requeridos'; msg.className = 'text-sm text-red-400'; msg.classList.remove('hidden'); return; }

  const res = await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
  if (res?.ok) {
    msg.textContent = '✓ Usuario creado correctamente';
    msg.className = 'text-sm text-green-400';
    ['new-name','new-email','new-password'].forEach(id => document.getElementById(id).value = '');
  } else {
    msg.textContent = res?.error || 'Error creando usuario';
    msg.className = 'text-sm text-red-400';
  }
  msg.classList.remove('hidden');
}
