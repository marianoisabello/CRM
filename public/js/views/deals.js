'use strict';

// Pipeline (oportunidades). La ficha de cada una vive en views/deal-drawer.js.

async function renderDealsPipeline(root) {
  root.innerHTML = `
    <div class="flex flex-col gap-10">
      ${pageHeader({
        eyebrow: 'Pipeline',
        title: 'Todo el pipeline en un tablero',
        subtitle: 'Arrastrá una tarjeta entre etapas: se guarda al soltar. Soltala en Ganado y celebramos con vos.',
        action: `<div class="flex flex-wrap items-center gap-2">
          <label class="ds-search" style="min-width:220px;">
            ${icon('search', 'w-4 h-4')}
            <input id="deals-q" type="search" placeholder="Buscar oportunidad, empresa, contacto…"
              oninput="clearTimeout(window._dealsQT);window._dealsQT=setTimeout(_renderDealsBoard,200)">
          </label>
          <button type="button" onclick="openDealForm('prospeccion')" class="btn-primary btn-lg">${icon('plus', 'w-4 h-4')} Nueva oportunidad</button>
        </div>`,
      })}
      <div id="deals-metrics" class="ds-kpi-row"></div>
      <div id="deals-kanban" class="flex gap-4 overflow-x-auto pb-2 nice-scroll" style="min-height:480px;">
        ${[1, 2, 3, 4, 5].map(() => `<div class="shrink-0" style="width:288px;"><div class="skeleton h-8 mb-3 rounded-lg"></div>${[1, 2].map(() => `<div class="skeleton h-28 mb-2 rounded-lg"></div>`).join('')}</div>`).join('')}
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
      kpiCardHtml({ label: 'Abiertas', valueHtml: countUpHtml(m.open_count || 0, 'display'), icon: 'zap', color: 'var(--info)', bg: 'var(--info-soft)' }),
      kpiCardHtml({ label: 'Pipeline', valueHtml: countUpMoneyHtml(m.pipeline_total || 0, 'USD', 'display'), icon: 'trendingUp', color: 'var(--primary)', bg: 'var(--primary-soft)' }),
      kpiCardHtml({ label: 'Tasa de cierre', valueHtml: `<span class="display" data-count-up="${m.win_rate || 0}" data-count-suffix="%">0%</span>`, icon: 'target', color: 'var(--warning)', bg: 'var(--warning-soft)' }),
      kpiCardHtml({ label: 'Ganadas', valueHtml: countUpHtml(m.won_count || 0, 'display'), footHtml: badgeHtml(fmtMoney(m.won_value || 0), 'violet', 'sm'), icon: 'circleCheck', color: '#a78bfa', bg: 'var(--accent-soft)' }),
    ].join('');
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

// Compat: llamadas viejas a _openCreateDeal
function _openCreateDeal() { openDealForm('prospeccion'); }
