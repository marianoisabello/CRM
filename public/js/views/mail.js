'use strict';

// Bandeja (Gmail, solo lectura). Tokens del lado del servidor (user_oauth_tokens, cifrados).
// Endpoints: /api/mail/status · /auth/start · /disconnect · /threads · /threads/:id

let _mailState = { q: '', label: 'INBOX', pageTokens: [null], page: 0, threads: [], activeId: null };

async function renderMail(root) {
  root.innerHTML = `<div class="space-y-4"><div class="skeleton h-20 rounded-xl"></div><div class="skeleton h-80 rounded-xl"></div></div>`;
  const st = await api('/api/mail/status');
  if (!st?.ok) {
    root.innerHTML = emptyState({ headline: 'Error cargando la Bandeja', body: st?.error || '' });
    return;
  }

  const header = (right = '') => `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        ${eyebrow('Herramientas')}
        <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Bandeja</h1>
        <p class="text-sm mt-1" style="color:var(--muted-foreground);">Mails de tu cuenta de Google · solo lectura${st.account_email ? ` · <span class="font-data" style="color:var(--foreground);">${_escHtml(st.account_email)}</span>` : ''}</p>
      </div>
      <div class="flex gap-2 no-print">${right}</div>
    </div>`;

  if (!st.connected) {
    const blocked = st.missing_table || !st.env_ready;
    root.innerHTML = `
      <div class="space-y-5 anim-fade-up">
        ${header()}
        <div class="card gradient-ring relative" style="padding:24px;">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="max-w-xl">
              <p class="display text-2xl" style="color:var(--foreground);">Conectá tu Gmail</p>
              <p class="text-sm mt-2" style="color:var(--muted-foreground);">Vas a ver tus hilos, buscarlos y leerlos sin salir del CRM. Pedimos solo permiso de <b style="color:var(--foreground);">lectura</b> (gmail.readonly): el CRM no envía, borra ni modifica mails. Si un remitente coincide con un lead o contacto, te lo mostramos.</p>
              ${st.last_error ? `<p class="text-xs mt-3" style="color:var(--danger);">Último error: ${_escHtml(st.last_error)}</p>` : ''}
            </div>
            <button type="button" class="btn-primary ${blocked ? 'opacity-50 cursor-not-allowed' : ''}" ${blocked ? 'disabled' : ''} onclick="_mailConnect()">Conectar Gmail</button>
          </div>
          ${blocked ? `
          <div class="mt-5 rounded-xl p-4" style="background:var(--warning-soft);border:1px solid rgb(245 177 76 / 0.35);">
            <p class="text-sm font-semibold" style="color:var(--warning);">Falta configuración del lado del servidor</p>
            <ul class="mt-2 space-y-1.5 list-disc pl-5">
              ${!st.env_ready ? '<li class="text-xs" style="color:var(--foreground);">No hay credenciales OAuth de Google configuradas.</li>' : ''}
              ${st.missing_table ? '<li class="text-xs" style="color:var(--foreground);">Falta la tabla <code>user_oauth_tokens</code> (scripts/migrations/010_user_oauth_tokens.sql).</li>' : ''}
            </ul>
          </div>` : ''}
          <details class="mt-5">
            <summary class="text-xs cursor-pointer font-medium" style="color:var(--primary);">Pasos de configuración en Google Cloud</summary>
            <ol class="mt-3 space-y-1.5 list-decimal pl-5">
              ${(st.setup?.steps || []).map((s) => `<li class="text-xs leading-relaxed" style="color:var(--muted-foreground);">${_escHtml(s)}</li>`).join('')}
            </ol>
            <p class="text-xs mt-3 font-data" style="color:var(--muted-foreground);">Redirect URI: <code>${_escHtml(st.setup?.redirect_uri || '')}</code></p>
          </details>
        </div>
      </div>`;
    return;
  }

  _mailState = { q: '', label: 'INBOX', pageTokens: [null], page: 0, threads: [], activeId: null };
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      ${header(`<button type="button" class="btn-ghost text-xs" onclick="_mailLoad()">Actualizar</button>
                <button type="button" class="btn-ghost text-xs" onclick="_mailDisconnect()">Desconectar</button>`)}
      <div class="flex flex-wrap gap-2">
        <input id="mail-q" type="search" class="input" style="max-width:380px;" placeholder="Buscar (ej. from:cliente@empresa.com, propuesta)…"
          onkeydown="if(event.key==='Enter'){_mailState.q=this.value.trim();_mailState.pageTokens=[null];_mailState.page=0;_mailLoad();}">
        <select id="mail-label" class="input" style="width:auto;" onchange="_mailState.label=this.value;_mailState.pageTokens=[null];_mailState.page=0;_mailLoad();">
          <option value="INBOX">Recibidos</option>
          <option value="SENT">Enviados</option>
          <option value="STARRED">Destacados</option>
          <option value="IMPORTANT">Importantes</option>
        </select>
      </div>
      <div class="grid lg:grid-cols-[minmax(280px,380px)_1fr] gap-4">
        <div class="table-shell flex flex-col" style="min-height:480px;">
          <div id="mail-list" class="flex-1 overflow-y-auto nice-scroll" style="max-height:calc(100vh - 280px);"></div>
          <div class="flex items-center justify-between px-3 py-2" style="border-top:1px solid var(--border);">
            <button type="button" id="mail-prev" class="text-xs" style="color:var(--muted-foreground);" onclick="_mailPage(-1)">← Anteriores</button>
            <span id="mail-page" class="font-data text-[11px]" style="color:var(--muted-foreground);"></span>
            <button type="button" id="mail-next" class="text-xs" style="color:var(--muted-foreground);" onclick="_mailPage(1)">Siguientes →</button>
          </div>
        </div>
        <div id="mail-reader" class="card" style="min-height:480px;">
          ${emptyState({ headline: 'Elegí un hilo', body: 'El mensaje se abre acá.' })}
        </div>
      </div>
    </div>`;
  await _mailLoad();
}

async function _mailLoad() {
  const list = document.getElementById('mail-list');
  if (!list) return;
  list.innerHTML = '<div class="p-3 space-y-2">' + '<div class="skeleton h-14 rounded-lg"></div>'.repeat(6) + '</div>';
  const params = new URLSearchParams({ limit: '25' });
  if (_mailState.q) params.set('q', _mailState.q);
  else params.set('label', _mailState.label);
  const tok = _mailState.pageTokens[_mailState.page];
  if (tok) params.set('pageToken', tok);

  const res = await api(`/api/mail/threads?${params}`);
  if (!res?.ok) {
    list.innerHTML = `<div class="p-4">${emptyState({
      headline: res?.reconnect ? 'Hay que reconectar Gmail' : 'No se pudieron leer los mails',
      body: res?.error || '',
      actionLabel: res?.reconnect ? 'Reconectar' : 'Reintentar',
      actionOnclick: res?.reconnect ? '_mailConnect()' : '_mailLoad()',
    })}</div>`;
    return;
  }
  _mailState.threads = res.threads || [];
  _mailState.pageTokens[_mailState.page + 1] = res.nextPageToken || null;
  document.getElementById('mail-page').textContent = `pág. ${_mailState.page + 1}`;
  document.getElementById('mail-prev').style.visibility = _mailState.page > 0 ? 'visible' : 'hidden';
  document.getElementById('mail-next').style.visibility = res.nextPageToken ? 'visible' : 'hidden';

  if (!_mailState.threads.length) {
    list.innerHTML = `<div class="p-4">${emptyState({ headline: 'Sin mails', body: _mailState.q ? 'No hay resultados para esa búsqueda.' : 'Esta carpeta está vacía.' })}</div>`;
    return;
  }
  list.innerHTML = _mailState.threads.map((t) => `
    <button type="button" class="mail-row w-full text-left px-3 py-2.5 transition" data-thread="${t.id}"
      style="border-bottom:1px solid var(--border);${t.id === _mailState.activeId ? 'background:var(--elevated);' : ''}"
      onmouseover="this.style.background='var(--elevated)'" onmouseout="if(this.dataset.thread!==_mailState.activeId)this.style.background=''"
      onclick="_mailOpen('${t.id}')">
      <div class="flex items-baseline justify-between gap-2">
        <p class="text-sm truncate ${t.unread ? 'font-semibold' : ''}" style="color:var(--foreground);">${_escHtml(t.from?.name || t.from?.email || '—')}${t.message_count > 1 ? ` <span class="font-data text-[10px]" style="color:var(--muted-foreground);">${t.message_count}</span>` : ''}</p>
        <span class="font-data text-[10px] shrink-0" style="color:var(--muted-foreground);">${fmtRelative(t.date)}</span>
      </div>
      <p class="text-xs truncate ${t.unread ? 'font-semibold' : ''}" style="color:${t.unread ? 'var(--foreground)' : 'var(--muted-foreground)'};">${t.unread ? '<span style="color:var(--primary);">● </span>' : ''}${_escHtml(t.subject)}</p>
      <p class="text-[11px] truncate mt-0.5" style="color:var(--muted-foreground);">${_escHtml(t.snippet)}</p>
    </button>`).join('');
}

function _mailPage(dir) {
  const next = _mailState.page + dir;
  if (next < 0 || (dir > 0 && !_mailState.pageTokens[next])) return;
  _mailState.page = next;
  _mailLoad();
}

function _mailIframeDoc(html) {
  // Documento aislado: sin scripts (sandbox sin allow-scripts), links en pestaña nueva
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><meta http-equiv="Content-Security-Policy" content="script-src 'none'">
    <style>body{font-family:system-ui,sans-serif;font-size:14px;color:#111;margin:14px;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
}

async function _mailOpen(id) {
  _mailState.activeId = id;
  document.querySelectorAll('.mail-row').forEach((el) => { el.style.background = el.dataset.thread === id ? 'var(--elevated)' : ''; });
  const reader = document.getElementById('mail-reader');
  reader.innerHTML = '<div class="skeleton h-8 mb-3 rounded-lg"></div><div class="skeleton h-64 rounded-lg"></div>';
  if (window.innerWidth < 1024) reader.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const res = await api(`/api/mail/threads/${encodeURIComponent(id)}`);
  if (!res?.ok) {
    reader.innerHTML = emptyState({ headline: 'No se pudo abrir el hilo', body: res?.error || '' });
    return;
  }
  const { thread, matches } = res;
  reader.innerHTML = `
    <div class="space-y-4">
      <h2 class="display text-2xl" style="color:var(--foreground);">${_escHtml(thread.subject)}</h2>
      ${matches?.length ? `<div class="flex flex-wrap gap-2">${matches.map((m) => `
        <a href="${m.href}" class="badge badge-primary" style="text-decoration:none;" title="${_escHtml(m.email)}">
          ${m.status === 'won' ? 'Contacto' : 'Lead'} en CRM · ${_escHtml(m.name || m.email)}${m.company ? ` · ${_escHtml(m.company)}` : ''}
        </a>`).join('')}</div>` : ''}
      ${thread.messages.map((m, i) => `
        <div class="rounded-xl border" style="border-color:var(--border);background:var(--elevated);">
          <div class="flex flex-wrap items-start justify-between gap-2 px-4 py-3" style="border-bottom:1px solid var(--border);">
            <div class="flex items-center gap-2.5 min-w-0">
              ${avatarHtml(m.from?.name || m.from?.email || '?', { size: 28 })}
              <div class="min-w-0">
                <p class="text-sm font-medium truncate" style="color:var(--foreground);">${_escHtml(m.from?.name || m.from?.email || '—')} <span class="font-normal text-xs" style="color:var(--muted-foreground);">${_escHtml(m.from?.email || '')}</span></p>
                <p class="text-[11px] truncate" style="color:var(--muted-foreground);">para ${_escHtml(m.to.map((x) => x.name || x.email).join(', ') || '—')}${m.cc.length ? ` · cc ${_escHtml(m.cc.map((x) => x.email).join(', '))}` : ''}</p>
              </div>
            </div>
            <span class="font-data text-[11px]" style="color:var(--muted-foreground);">${fmtDate(m.date)}</span>
          </div>
          <div class="p-3" id="mail-body-${i}"></div>
          ${m.attachments?.length ? `<div class="px-4 pb-3 flex flex-wrap gap-1.5">${m.attachments.map((a) => `<span class="badge badge-neutral">📎 ${_escHtml(a.filename)}</span>`).join('')}</div>` : ''}
        </div>`).join('')}
    </div>`;

  thread.messages.forEach((m, i) => {
    const box = document.getElementById(`mail-body-${i}`);
    if (!box) return;
    if (m.html) {
      const iframe = document.createElement('iframe');
      iframe.className = 'mail-frame';
      iframe.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      iframe.srcdoc = _mailIframeDoc(m.html);
      iframe.onload = () => {
        try { iframe.style.height = Math.min(1600, iframe.contentDocument.body.scrollHeight + 30) + 'px'; } catch (_) { iframe.style.height = '480px'; }
      };
      box.appendChild(iframe);
    } else {
      box.innerHTML = `<pre class="text-sm whitespace-pre-wrap leading-relaxed px-1" style="color:var(--foreground);font-family:var(--font-sans);">${_escHtml(m.text || m.snippet || '(sin contenido)')}</pre>`;
    }
  });
}

async function _mailConnect() {
  const res = await api('/api/mail/auth/start');
  if (res?.ok && res.url) {
    window.location.href = res.url;
    return;
  }
  showToast(res?.error || 'No se pudo iniciar la conexión con Google', 'error');
}

async function _mailDisconnect() {
  if (!confirm('¿Desconectar Gmail? Se borran los tokens guardados en el servidor.')) return;
  const res = await api('/api/mail/disconnect', { method: 'POST', body: {} });
  if (res?.ok) {
    showToast('Gmail desconectado');
    renderMail(document.getElementById('view-root'));
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}
