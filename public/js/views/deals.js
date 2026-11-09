'use strict';

async function renderDealsPipeline(root) {
  root.innerHTML = `
    <div class="space-y-4 anim-fade-up">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          ${eyebrow('Herramientas')}
          <h1 class="display text-3xl mt-1" style="color:var(--foreground);">Pipeline deals</h1>
          <p class="text-sm mt-1" style="color:var(--muted-foreground);">Arrastrá cada oportunidad a su etapa: se guarda al soltar.</p>
        </div>
        <div class="flex items-center gap-2">
          <input id="deals-q" type="search" placeholder="Buscar oportunidad…" class="input" style="width:200px;"
            oninput="clearTimeout(window._dealsQT);window._dealsQT=setTimeout(_renderDealsBoard,200)">
          <button type="button" onclick="openDealForm('prospeccion')" class="btn-primary text-xs px-3 py-2">+ Oportunidad</button>
          <button type="button" onclick="renderDealsPipeline(document.getElementById('view-root'))" class="btn-ghost flex items-center gap-1.5 text-xs">Actualizar</button>
        </div>
      </div>
      <div id="deals-metrics" class="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-xl border" style="border-color:var(--border);background:var(--border);"></div>
      <div id="deals-kanban" class="flex gap-3 overflow-x-auto pb-4 nice-scroll" style="min-height:480px;">
        ${[1,2,3,4,5].map(() => `<div class="shrink-0 w-64"><div class="skeleton h-8 mb-3 rounded-lg"></div>${[1,2].map(() => `<div class="skeleton h-24 mb-2 rounded-lg"></div>`).join('')}</div>`).join('')}
      </div>
    </div>`;

  const [stagesRes, dealsRes, metricsRes, usersRes] = await Promise.all([
    api('/api/pipeline-stages'),
    api('/api/deals?limit=300'),
    api('/api/deals/metrics'),
    api('/api/crm/users'),
  ]);

  const users = Object.fromEntries((usersRes?.users || []).map((u) => [u.id, { id: u.id, name: u.name || u.email }]));
  window._dealsData = {
    stages: (stagesRes?.stages || []).filter((s) => s.active !== false),
    deals: (dealsRes?.deals || []).map((d) => ({ ...d, owner: d.owner_id ? users[d.owner_id] || null : null })),
  };
  const m = metricsRes?.metrics || {};

  const metricsEl = document.getElementById('deals-metrics');
  if (metricsEl) {
    metricsEl.innerHTML = [
      { label: 'Abiertas', html: countUpHtml(m.open_count || 0), color: 'var(--info)' },
      { label: 'Pipeline', html: countUpMoneyHtml(m.pipeline_total || 0), color: 'var(--primary)' },
      { label: 'Tasa de cierre', html: `<span data-count-up="${m.win_rate || 0}" data-count-suffix="%">0%</span>`, color: 'var(--success)' },
      { label: 'Ganadas', html: `${countUpHtml(m.won_count || 0)} <span class="text-sm font-normal" style="color:var(--muted-foreground);">· ${fmtMoney(m.won_value || 0)}</span>`, color: 'var(--primary)' },
    ].map((k) => `
      <div class="kpi-card" style="border:none;border-radius:0;border-left:3px solid ${k.color};">
        <p class="eyebrow" style="color:var(--muted-foreground);">${k.label}</p>
        <p class="font-data text-2xl font-bold mt-2 tnum" style="color:var(--foreground);">${k.html}</p>
      </div>`).join('');
    hydrateMotion(metricsEl);
  }

  _renderDealsBoard();
}

function _renderDealsBoard() {
  const board = document.getElementById('deals-kanban');
  if (!board || !window._dealsData) return;
  const q = (document.getElementById('deals-q')?.value || '').trim().toLowerCase();
  const deals = q
    ? window._dealsData.deals.filter((d) => `${d.title} ${d.companies?.name || ''} ${d.contacts?.name || ''}`.toLowerCase().includes(q))
    : window._dealsData.deals;
  renderDealKanban(board, {
    stages: window._dealsData.stages,
    deals,
    onChange: () => renderDealsPipeline(document.getElementById('view-root')),
  });
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
      <div class="flex flex-wrap items-end gap-2">
        <div class="flex-1 min-w-[160px]">
          <p class="eyebrow mb-1.5">Mover a etapa</p>
          <select id="deal-stage-select" class="input">
            ${_dealStageCols(_kanbanState.stages?.length ? _kanbanState.stages : (window._dealsData?.stages || []))
              .map((s) => `<option value="${s.key}" ${s.key === deal.stage ? 'selected' : ''}>${_escHtml(s.label)}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="btn-primary text-xs" onclick="_moveDealFromDrawer('${deal.id}','${deal.stage}')">Mover</button>
        ${deal.leads?.id ? `<a href="${deal.leads.status === 'won' ? `#contacts/${deal.leads.id}` : '#leads'}" class="btn-ghost text-xs" style="text-decoration:none;" onclick="closeModal()">${deal.leads.status === 'won' ? 'Ficha del contacto' : 'Ver lead'}</a>` : ''}
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

async function _moveDealFromDrawer(dealId, fromStage) {
  const toStage = document.getElementById('deal-stage-select')?.value;
  if (!toStage || toStage === fromStage) return;
  const res = await api(`/api/deals/${dealId}/stage`, { method: 'PATCH', body: { stage: toStage } });
  if (!res?.ok) { showToast(res?.error || 'Error cambiando etapa', 'error'); return; }
  const col = _dealStageCols(_kanbanState.stages?.length ? _kanbanState.stages : (window._dealsData?.stages || [])).find((c) => c.key === toStage);
  if (col?.celebrate) celebrate();
  showToast(`Etapa: ${col?.label || toStage}`);
  closeModal();
  if (typeof _kanbanState.onChange === 'function') _kanbanState.onChange();
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

// Compat: llamadas viejas a _openCreateDeal
function _openCreateDeal() { openDealForm('prospeccion'); }
