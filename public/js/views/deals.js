'use strict';

async function renderDealsPipeline(root) {
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('CRM')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Pipeline deals</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Oportunidades comerciales por etapa</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="_openCreateDeal()" class="btn-primary text-xs px-3 py-2">+ Deal</button>
          <button type="button" onclick="renderDealsPipeline(document.getElementById('view-root'))" class="btn-ghost flex items-center gap-1.5 text-xs">Actualizar</button>
        </div>
      </div>
      <div id="deals-metrics" class="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-xl border" style="border-color:var(--border);background:var(--border);"></div>
      <div id="deals-kanban" class="flex gap-3 overflow-x-auto pb-4 nice-scroll" style="min-height:480px;">
        ${[1,2,3,4,5].map(() => `<div class="shrink-0 w-64"><div class="skeleton h-8 mb-3 rounded-lg"></div>${[1,2].map(() => `<div class="skeleton h-24 mb-2 rounded-lg"></div>`).join('')}</div>`).join('')}
      </div>
    </div>`;

  const [stagesRes, dealsRes, metricsRes] = await Promise.all([
    api('/api/pipeline-stages'),
    api('/api/deals?limit=300'),
    api('/api/deals/metrics'),
  ]);

  const stages = (stagesRes?.stages || []).filter((s) => s.active !== false);
  const deals = dealsRes?.deals || [];
  const m = metricsRes?.metrics || {};

  const metricsEl = document.getElementById('deals-metrics');
  if (metricsEl) {
    metricsEl.innerHTML = [
      { label: 'Abiertos', val: m.open_count || 0, color: 'var(--info)' },
      { label: 'Pipeline', val: fmtMoney(m.pipeline_total || 0), color: 'var(--primary)', raw: false },
      { label: 'Win rate', val: `${m.win_rate || 0}%`, color: 'var(--success)', raw: false },
      { label: 'Ganados', val: m.won_count || 0, color: 'var(--primary)' },
    ].map((k) => `
      <div class="kpi-card" style="border:none;border-radius:0;border-left:3px solid ${k.color};">
        <p class="eyebrow" style="color:var(--muted-foreground);">${k.label}</p>
        <p class="font-data text-2xl font-bold mt-2 tnum" style="color:var(--foreground);">${k.raw === false ? k.val : countUpHtml(k.val)}</p>
      </div>`).join('');
  }

  const cols = stages.length
    ? stages.map((s) => ({
        key: s.key,
        label: s.name || dealStageLabel[s.key] || s.key,
        ...(dealStageColors[s.key] || { color: 'var(--muted-foreground)', soft: 'var(--secondary)' }),
      }))
    : Object.keys(dealStageLabel).map((key) => ({
        key,
        label: dealStageLabel[key],
        ...(dealStageColors[key] || {}),
      }));

  const grouped = {};
  cols.forEach((c) => { grouped[c.key] = []; });
  deals.forEach((d) => {
    const k = d.stage || 'prospeccion';
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(d);
  });

  const board = document.getElementById('deals-kanban');
  if (!board) return;

  board.innerHTML = cols.map((col) => {
    const items = grouped[col.key] || [];
    const cards = items.map((d) => {
      const contact = d.contacts?.name || d.contact_name || '—';
      const company = d.companies?.name || '—';
      return `<div class="kanban-card rounded-xl p-3 mb-2 cursor-pointer border"
                   style="background:var(--card);border-color:var(--border);"
                   draggable="true"
                   ondragstart="this.classList.add('card-dragging');event.dataTransfer.setData('dealId','${d.id}');event.dataTransfer.setData('fromStage','${d.stage}');"
                   ondragend="this.classList.remove('card-dragging')"
                   onmouseover="this.style.borderColor='${col.color}'"
                   onmouseout="this.style.borderColor='var(--border)'"
                   onclick="openDealDrawer('${d.id}')">
        <p class="font-medium text-sm leading-tight mb-1" style="color:var(--foreground);">${_escHtml(d.title || 'Sin título')}</p>
        <p class="text-xs truncate mb-2" style="color:var(--muted-foreground);">${_escHtml(company)} · ${_escHtml(contact)}</p>
        <div class="flex items-center justify-between">
          <span class="font-data text-xs" style="color:${col.color};">${fmtMoney(d.value, d.currency)}</span>
          <span class="font-data text-xs" style="color:var(--muted-foreground);">${d.probability != null ? d.probability + '%' : ''}</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="kanban-col shrink-0 w-64 flex flex-col rounded-xl p-3" data-stage="${col.key}" style="background:var(--elevated);border:1px solid var(--border);"
                ondragover="event.preventDefault();this.querySelector('.kanban-drop-zone').style.background='${col.soft}';"
                ondragleave="this.querySelector('.kanban-drop-zone').style.background='';"
                ondrop="this.querySelector('.kanban-drop-zone').style.background='';_dealsDrop(event,'${col.key}');">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" style="background:${col.color};"></div>
          <span class="eyebrow" style="color:var(--muted-foreground);">${_escHtml(col.label)}</span>
        </div>
        <span class="font-data text-xs font-semibold px-2 py-0.5 rounded-full" style="background:${col.soft};color:${col.color};border:1px solid var(--border);">${items.length}</span>
      </div>
      <div class="kanban-drop-zone flex-1 overflow-y-auto transition-colors rounded-lg nice-scroll" style="max-height:calc(100vh - 280px);">
        ${cards || `<div class="text-xs text-center py-8 rounded-xl border-2 border-dashed" style="color:var(--muted-foreground);border-color:var(--border);">Sin deals</div>`}
      </div>
    </div>`;
  }).join('');
  hydrateMotion(board);
}

async function _dealsDrop(event, toStage) {
  event.preventDefault();
  const dealId = event.dataTransfer.getData('dealId');
  const fromStage = event.dataTransfer.getData('fromStage');
  if (!dealId || fromStage === toStage) return;

  const res = await api(`/api/deals/${dealId}/stage`, { method: 'PATCH', body: { stage: toStage } });
  if (res?.ok) {
    if (toStage === 'ganado' && typeof celebrate === 'function') celebrate();
    showToast(`Stage: ${dealStageLabel[toStage] || toStage}`);
    renderDealsPipeline(document.getElementById('view-root'));
  } else {
    showToast(res?.error || 'Error cambiando stage', 'error');
  }
}

async function openDealDrawer(dealId) {
  const modal = document.getElementById('lead-modal');
  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');
  const footerLabel = document.getElementById('modal-footer-label');
  document.getElementById('modal-name').textContent = 'Cargando deal…';
  document.getElementById('modal-source').textContent = '';
  body.innerHTML = '<p class="text-sm" style="color:var(--muted-foreground);">Cargando…</p>';
  if (footer) footer.style.display = 'none';
  if (footerLabel) footerLabel.style.display = 'none';
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('is-open'));

  const [dealRes, actRes] = await Promise.all([
    api(`/api/deals/${dealId}`),
    api(`/api/activities?deal_id=${dealId}&limit=30`),
  ]);
  const deal = dealRes?.deal;
  if (!deal) {
    body.innerHTML = emptyState({ headline: 'Deal no encontrado' });
    return;
  }

  document.getElementById('modal-name').textContent = deal.title || 'Deal';
  document.getElementById('modal-source').textContent =
    `${dealStageLabel[deal.stage] || deal.stage} · ${fmtMoney(deal.value, deal.currency)}`;

  const acts = actRes?.activities || [];
  body.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div><p class="eyebrow mb-1">Contacto</p><p style="color:var(--foreground);">${_escHtml(deal.contacts?.name || '—')}</p></div>
        <div><p class="eyebrow mb-1">Empresa</p><p style="color:var(--foreground);">${_escHtml(deal.companies?.name || '—')}</p></div>
        <div><p class="eyebrow mb-1">Estado</p><p style="color:var(--foreground);">${_escHtml(deal.status)}</p></div>
        <div><p class="eyebrow mb-1">Prob.</p><p class="font-data" style="color:var(--foreground);">${deal.probability != null ? deal.probability + '%' : '—'}</p></div>
      </div>
      <div>
        <p class="eyebrow mb-2">Actividad</p>
        ${acts.length ? acts.map((a) => `
          <div class="py-2" style="border-bottom:1px solid var(--border);">
            <div class="flex justify-between gap-2">
              <p class="text-sm font-medium" style="color:var(--foreground);">${_escHtml(a.title)}</p>
              <span class="font-data text-[10px] shrink-0" style="color:var(--muted-foreground);">${fmtDate(a.occurred_at)}</span>
            </div>
            ${a.body ? `<p class="text-xs mt-0.5" style="color:var(--muted-foreground);">${_escHtml(String(a.body).slice(0, 180))}</p>` : ''}
          </div>`).join('') : `<p class="text-xs" style="color:var(--muted-foreground);">Sin actividades</p>`}
      </div>
      <div class="flex gap-2">
        <input id="deal-note-input" class="flex-1 rounded-lg px-3 py-2 text-sm" style="background:var(--elevated);border:1px solid var(--border);color:var(--foreground);" placeholder="Nota rápida…" />
        <button type="button" class="btn-ghost text-xs" onclick="_addDealNote('${deal.id}')">Guardar</button>
      </div>
    </div>`;
}

async function _addDealNote(dealId) {
  const input = document.getElementById('deal-note-input');
  const title = (input?.value || '').trim();
  if (!title) return;
  const res = await api('/api/activities', {
    method: 'POST',
    body: { type: 'note', title, deal_id: dealId },
  });
  if (res?.ok) {
    showToast('Nota guardada');
    openDealDrawer(dealId);
  } else {
    showToast(res?.error || 'Error', 'error');
  }
}

async function _openCreateDeal() {
  const title = prompt('Título del deal:');
  if (!title || !title.trim()) return;
  const res = await api('/api/deals', {
    method: 'POST',
    body: { title: title.trim(), stage: 'prospeccion', status: 'open', probability: 25 },
  });
  if (res?.ok) {
    showToast('Deal creado');
    renderDealsPipeline(document.getElementById('view-root'));
  } else {
    showToast(res?.error || 'Error creando deal', 'error');
  }
}
