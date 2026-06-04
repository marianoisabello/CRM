function renderSettings(root) {
  const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
  const userName = user.name || user.email || 'Admin';
  
  root.innerHTML = `
    <div class="space-y-6 max-w-2xl">
      <div>
        <h1 class="text-2xl font-semibold text-white flex items-center gap-3">
          <svg class="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          Configuracion
        </h1>
        <p class="text-gray-500 text-[13px] mt-1">Gestion de usuarios y ajustes del sistema</p>
      </div>

      <!-- Usuario actual -->
      <div class="card">
        <h2 class="font-semibold text-[13px] text-white mb-4 flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          Usuario actual
        </h2>
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xl font-bold shadow-lg shadow-violet-900/30">
            ${userName[0].toUpperCase()}
          </div>
          <div>
            <p class="font-medium text-white text-[15px]">${user.name || '-'}</p>
            <p class="text-gray-400 text-[13px]">${user.email || '-'}</p>
            <span class="badge bg-violet-500/15 text-violet-400 border border-violet-500/30 mt-2 inline-block text-[10px] uppercase tracking-wide font-semibold">${user.role || 'admin'}</span>
          </div>
        </div>
      </div>

      <!-- Crear usuario admin -->
      <div class="card">
        <h2 class="font-semibold text-[13px] text-white mb-4 flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
          Crear nuevo usuario admin
        </h2>
        <div class="space-y-4">
          <div><label class="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block font-medium">Nombre</label>
            <input id="new-name" placeholder="Nombre completo" class="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-500 focus:border-violet-500 transition-colors"></div>
          <div><label class="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block font-medium">Email</label>
            <input id="new-email" type="email" placeholder="email@ejemplo.com" class="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-500 focus:border-violet-500 transition-colors"></div>
          <div><label class="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block font-medium">Password</label>
            <input id="new-password" type="password" placeholder="Minimo 8 caracteres" class="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-500 focus:border-violet-500 transition-colors"></div>
          <button onclick="createUser()" class="bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2.5 rounded-lg text-[13px] font-semibold">
            Crear usuario
          </button>
          <p id="create-msg" class="text-[13px] hidden"></p>
        </div>
      </div>

      <!-- Estado integraciones -->
      <div class="card">
        <h2 class="font-semibold text-[13px] text-white mb-4 flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          Estado de integraciones
        </h2>
        <div class="space-y-0">
          ${renderIntegration('Supabase', true, 'Base de datos conectada')}
          ${renderIntegration('Anthropic Claude', true, 'Agentes IA activos')}
          ${renderIntegration('ManyChat', true, 'Canal WhatsApp / Instagram')}
          ${renderIntegration('Google Calendar', false, 'Configurar GOOGLE_CALENDAR_*')}
          ${renderIntegration('Google Sheets', false, 'Configurar GOOGLE_SHEETS_SA_KEY')}
          ${renderIntegration('Meta Ads', false, 'Configurar META_ADS_ACCESS_TOKEN')}
          ${renderIntegration('Google Ads', false, 'Configurar GOOGLE_ADS_*')}
        </div>
      </div>
    </div>`;
}

function renderIntegration(name, active, note) {
  return `<div class="flex items-center justify-between py-3 border-b border-gray-800/50 last:border-0">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg ${active ? 'bg-green-500/15' : 'bg-gray-800/60'} flex items-center justify-center">
        ${active 
          ? '<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
          : '<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
        }
      </div>
      <div>
        <p class="text-[13px] font-medium ${active ? 'text-gray-200' : 'text-gray-400'}">${name}</p>
        <p class="text-[11px] text-gray-500">${note}</p>
      </div>
    </div>
    <span class="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md ${active ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-gray-800/60 text-gray-500 border border-gray-700/60'}">
      ${active ? 'Activo' : 'Inactivo'}
    </span>
  </div>`;
}

async function createUser() {
  const name = document.getElementById('new-name').value;
  const email = document.getElementById('new-email').value;
  const password = document.getElementById('new-password').value;
  const msg = document.getElementById('create-msg');

  if (!email || !password) { 
    msg.textContent = 'Email y password son requeridos'; 
    msg.className = 'text-[13px] text-red-400 flex items-center gap-1.5'; 
    msg.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Email y password son requeridos';
    msg.classList.remove('hidden'); 
    return; 
  }

  const res = await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
  if (res?.ok) {
    msg.className = 'text-[13px] text-green-400 flex items-center gap-1.5';
    msg.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Usuario creado correctamente';
    ['new-name','new-email','new-password'].forEach(id => document.getElementById(id).value = '');
  } else {
    msg.className = 'text-[13px] text-red-400 flex items-center gap-1.5';
    msg.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> ${res?.error || 'Error creando usuario'}`;
  }
  msg.classList.remove('hidden');
}
