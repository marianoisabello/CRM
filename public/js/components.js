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

// Íconos (trazos de lucide, los mismos del diseño nuevo)
const _iconPaths = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  calendarCheck: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  searchX: '<path d="m13.5 8.5-5 5"/><path d="m8.5 8.5 5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevronsUpDown: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowUpRight: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  arrowDownRight: '<path d="m7 7 10 10"/><path d="M17 7v10H7"/>',
  trendingUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  circleCheck: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  grip: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  send: '<path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  externalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
};

/** SVG de ícono (stroke currentColor). cls = clases de tamaño, ej. 'size-4' */
function icon(name, cls = 'w-4 h-4') {
  return `<svg class="${cls} shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_iconPaths[name] || ''}</svg>`;
}

/** Badge del diseño. tone: teal|violet|success|warning|danger|info|neutral · size: sm|md|lg */
function badgeHtml(content, tone = 'neutral', size = 'md', extraClass = '') {
  return `<span class="ds-badge ds-badge-${tone} ds-badge-${size} ${extraClass}">${content}</span>`;
}

/** Sección del diseño: eyebrow + título display + subtítulo + acción a la derecha */
function sectionHtml({ eyebrow: eb, title, subtitle, action = '', body = '', id = '' }) {
  return `<section class="ds-section anim-fade-up flex flex-col gap-5" ${id ? `id="${id}"` : ''}>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-col gap-2">
        ${eb ? `<p class="eyebrow">${_escHtml(eb)}</p>` : ''}
        <h2 class="display text-3xl md:text-[34px]" style="color:var(--foreground);">${_escHtml(title)}</h2>
        ${subtitle ? `<p class="max-w-xl text-sm leading-relaxed" style="color:var(--muted-foreground);">${subtitle}</p>` : ''}
      </div>
      ${action}
    </div>
    ${body}
  </section>`;
}

/** Encabezado de página (vistas que no son el Panel) */
function pageHeader({ eyebrow: eb, title, subtitle, action = '' }) {
  return `<div class="flex flex-wrap items-end justify-between gap-4 anim-fade-up">
    <div class="flex flex-col gap-2 min-w-0">
      ${eb ? `<p class="eyebrow">${_escHtml(eb)}</p>` : ''}
      <h1 class="display text-4xl md:text-5xl" style="color:var(--foreground);">${_escHtml(title)}</h1>
      ${subtitle ? `<p class="max-w-2xl text-sm leading-relaxed" style="color:var(--muted-foreground);">${subtitle}</p>` : ''}
    </div>
    ${action}
  </div>`;
}

/** Tarjeta KPI del diseño (va dentro de .ds-kpi-row) */
function kpiCardHtml({ label, valueHtml, footHtml = '', icon: ic = 'trendingUp', color = 'var(--primary)', bg = 'var(--primary-soft)', onclick = '' }) {
  return `<article class="ds-kpi group ${onclick ? 'cursor-pointer' : ''}" ${onclick ? `onclick="${onclick}" role="button" tabindex="0"` : ''}>
    <div class="flex items-center justify-between gap-3">
      <span class="eyebrow" style="color:var(--muted-foreground);">${_escHtml(label)}</span>
      <span class="ds-kpi-icon" style="background:${bg};color:${color};">${icon(ic, 'w-4 h-4')}</span>
    </div>
    <p class="ds-kpi-value tnum">${valueHtml}</p>
    ${footHtml ? `<div class="self-start">${footHtml}</div>` : ''}
  </article>`;
}

/** Δ vs período anterior como badge del diseño (teal si sube, warning si baja). */
function deltaBadge(curr, prev, { mode = 'pct', label = 'vs mes anterior' } = {}) {
  if (curr == null || prev == null) return badgeHtml(`sin dato ${_escHtml(label)}`, 'neutral', 'sm');
  let diff;
  let txt;
  if (mode === 'pct') {
    if (!prev) {
      if (!curr) return badgeHtml(`= ${_escHtml(label)}`, 'neutral', 'sm');
      return badgeHtml(`${icon('arrowUpRight', 'w-3 h-3')} nuevo ${_escHtml(label)}`, 'teal', 'sm');
    }
    diff = Math.round(((curr - prev) / Math.abs(prev)) * 100);
    txt = `${diff > 0 ? '+' : ''}${diff}%`;
  } else {
    diff = Math.round(curr - prev);
    txt = `${diff > 0 ? '+' : ''}${diff}${mode === 'pts' ? ' pts' : ''}`;
  }
  if (!diff) return badgeHtml(`= ${_escHtml(label)}`, 'neutral', 'sm');
  return badgeHtml(`${icon(diff > 0 ? 'arrowUpRight' : 'arrowDownRight', 'w-3 h-3')} ${txt} ${_escHtml(label)}`, diff > 0 ? 'teal' : 'warning', 'sm');
}

/** Importe compacto: "US$ 125,5 mil" */
function fmtCompact(value, currency = 'USD') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch (_) {
    return fmtMoney(n, currency);
  }
}

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
  return `<div class="flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-10 text-center anim-fade-up ${extra}"
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

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (_) { return false; }
}

/** Número que anima de 0 → value al hidratar */
function countUpHtml(value, className = '') {
  const n = Number(value) || 0;
  return `<span class="font-data tnum ${className}" data-count-up="${n}">${prefersReducedMotion() ? n : 0}</span>`;
}

/** Importe que anima de 0 → value con formato de moneda */
function countUpMoneyHtml(value, currency = 'USD', className = '') {
  const n = Number(value) || 0;
  return `<span class="font-data tnum ${className}" data-count-up="${n}" data-count-format="money" data-count-currency="${_escHtml(currency || 'USD')}">${fmtMoney(prefersReducedMotion() ? n : 0, currency)}</span>`;
}

function _countFormat(el, v) {
  if (el.dataset.countFormat === 'money') return fmtMoney(v, el.dataset.countCurrency || 'USD');
  return String(Math.round(v)) + (el.dataset.countSuffix || '');
}

/** Barra de progreso animable — pct 0–100 */
function progressBar(pct, color = 'var(--primary)', height = 6) {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  return `<div class="bar-track" style="height:${height}px;">
    <div class="bar-fill" data-width="${w}%" style="background:${color};--bar-target:${w}%;"></div>
  </div>`;
}

/** Activa bars + count-ups dentro de un contenedor (solo visual). */
function hydrateMotion(scope) {
  const root = scope || document;
  const reduce = prefersReducedMotion();

  root.querySelectorAll('.bar-fill[data-width]').forEach((el) => {
    const target = el.getAttribute('data-width') || '0%';
    if (reduce) {
      el.style.width = target;
      return;
    }
    el.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.width = target; });
    });
  });

  root.querySelectorAll('[data-count-up]').forEach((el) => {
    if (el.dataset.countDone === '1') return;
    el.dataset.countDone = '1';
    const target = parseFloat(el.dataset.countUp);
    if (!Number.isFinite(target)) return;
    if (reduce) {
      el.textContent = _countFormat(el, target);
      return;
    }
    const duration = 900;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = _countFormat(el, target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = _countFormat(el, target);
    };
    requestAnimationFrame(tick);
  });
}

function playViewEnter(root) {
  if (!root || prefersReducedMotion()) return;
  root.classList.remove('view-enter');
  void root.offsetWidth;
  root.classList.add('view-enter');
  hydrateMotion(root);
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function scoreBar(score) {
  if (score === null || score === undefined) {
    return '<span class="font-data text-xs" style="color:var(--muted-foreground);">—</span>';
  }
  // Umbrales de negocio intactos: >=65 / >=40
  const color = score >= 65 ? 'var(--danger)' : score >= 40 ? 'var(--warning)' : 'var(--info)';
  return `<div class="flex items-center gap-1.5">
    <div class="bar-track w-14" style="height:6px;">
      <div class="bar-fill" data-width="${score}%" style="background:${color};--bar-target:${score}%;"></div>
    </div>
    <span class="font-data text-xs tnum" style="color:var(--muted-foreground);">${score}</span>
  </div>`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return '—';
  }
}

function fmtMoney(value, currency = 'USD') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  } catch (_) {
    return `${currency} ${Math.round(n)}`;
  }
}

/** "hace 2 h", "ayer", "hace 4 días", "en 3 días" */
function fmtRelative(ts) {
  if (!ts) return '—';
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const min = Math.round(abs / 60000);
  const h = Math.round(abs / 3600000);
  const d = Math.round(abs / 86400000);
  let s;
  if (min < 1) return 'recién';
  if (min < 60) s = `${min} min`;
  else if (h < 24) s = `${h} h`;
  else if (d === 1) return future ? 'mañana' : 'ayer';
  else if (d < 30) s = `${d} días`;
  else if (d < 365) s = `${Math.round(d / 30)} meses`;
  else s = `${Math.round(d / 365)} años`;
  return future ? `en ${s}` : `hace ${s}`;
}

function fmtDay(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {
    return '—';
  }
}

/** Δ vs período anterior → chip coloreado. mode: 'pct' | 'abs' | 'pts' */
function deltaChip(curr, prev, { mode = 'pct', label = 'vs mes anterior' } = {}) {
  if (curr == null || prev == null) {
    return `<span class="text-xs" style="color:var(--muted-foreground);">sin dato ${_escHtml(label)}</span>`;
  }
  let diff;
  let txt;
  if (mode === 'pct') {
    if (!prev) {
      if (!curr) return `<span class="text-xs" style="color:var(--muted-foreground);">= ${_escHtml(label)}</span>`;
      return `<span class="text-xs font-data" style="color:var(--success);">nuevo</span> <span class="text-xs" style="color:var(--muted-foreground);">${_escHtml(label)}</span>`;
    }
    diff = Math.round(((curr - prev) / Math.abs(prev)) * 100);
    txt = `${diff > 0 ? '+' : ''}${diff}%`;
  } else if (mode === 'pts') {
    diff = Math.round(curr - prev);
    txt = `${diff > 0 ? '+' : ''}${diff} pts`;
  } else {
    diff = Math.round(curr - prev);
    txt = `${diff > 0 ? '+' : ''}${diff}`;
  }
  const color = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--muted-foreground)';
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
  return `<span class="text-xs font-data" style="color:${color};">${arrow} ${txt}</span> <span class="text-xs" style="color:var(--muted-foreground);">${_escHtml(label)}</span>`;
}

/** Descarga CSV en el navegador. rows: array de objetos; cols: [{key,label}] */
function downloadCsv(filename, rows, cols) {
  const esc = (v) => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => esc(c.label)).join(',');
  const body = (rows || []).map((r) => cols.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(',')).join('\n');
  const blob = new Blob(['﻿' + head + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/** Abre el modal compartido con contenido arbitrario (sin botones de estado). */
function openModalShell(title, subtitle, bodyHtml) {
  const modal = document.getElementById('lead-modal');
  document.getElementById('modal-name').textContent = title || '';
  document.getElementById('modal-source').textContent = subtitle || '';
  document.getElementById('modal-body').innerHTML = bodyHtml || '';
  const footer = document.getElementById('modal-footer');
  if (footer) footer.style.display = 'none';
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.add('is-open');
    hydrateMotion(modal);
  });
}

// ─── Kanban de oportunidades (deals) — compartido por Dashboard y Pipeline deals ─

let _kanbanState = { stages: [], deals: [], onChange: null };

function _dealStageCols(stages) {
  const list = (stages || []).filter((s) => s.active !== false);
  if (list.length) {
    return list.map((s) => ({
      key: s.key,
      label: s.name || dealStageLabel[s.key] || s.key,
      celebrate: Boolean(s.celebrate || s.is_won),
      ...(dealStageColors[s.key] || { color: 'var(--muted-foreground)', soft: 'var(--secondary)' }),
    }));
  }
  return Object.keys(dealStageLabel).map((key) => ({ key, label: dealStageLabel[key], celebrate: key === 'ganado', ...(dealStageColors[key] || {}) }));
}

function _dealDays(d) {
  if (d.days_in_stage != null) return d.days_in_stage;
  return d.stage_entered_at ? Math.max(0, Math.floor((Date.now() - new Date(d.stage_entered_at)) / 86400000)) : null;
}

function _dealCardHtml(d) {
  const contact = d.contacts?.name || '';
  const company = d.companies?.name || '';
  const heading = company || d.title || 'Sin título';
  const sub = [contact, company ? d.title : null].filter(Boolean).join(' · ') || 'Sin contacto';
  const days = _dealDays(d);
  const owner = d.owner?.name || null;
  return `<article class="kanban-card group" data-deal-id="${d.id}" role="button" tabindex="0" title="${_escHtml(d.title || '')}"
      draggable="true"
      ondragstart="_kanbanDragStart(event,'${d.id}','${d.stage}')"
      ondragend="this.classList.remove('card-dragging');window._kanbanDragging=false;document.querySelectorAll('.kanban-col.is-over').forEach((c)=>c.classList.remove('is-over'))"
      onclick="openDealDrawer('${d.id}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDealDrawer('${d.id}')}">
    <div class="flex items-start justify-between gap-2">
      <div class="flex flex-col gap-0.5 min-w-0">
        <p class="text-sm leading-tight font-semibold" style="color:var(--foreground);">${_escHtml(heading)}</p>
        <p class="text-xs truncate" style="color:var(--muted-foreground);">${_escHtml(sub)}</p>
      </div>
      <span class="kanban-grip">${icon('grip', 'w-4 h-4')}</span>
    </div>
    <p class="display mt-3 text-2xl leading-none tnum" style="color:var(--primary);">${fmtMoney(d.value, d.currency)}</p>
    <div class="mt-3.5 flex items-center justify-between gap-2">
      ${days != null ? badgeHtml(`${icon('clock', 'w-3 h-3')} ${days} d en etapa`, days > 14 ? 'danger' : 'neutral', 'sm') : '<span></span>'}
      ${owner ? avatarHtml(owner, { size: 24 }) : ''}
    </div>
  </article>`;
}

function _kanbanEmptyHtml(col) {
  const won = col.celebrate;
  return `<div class="kanban-empty flex flex-col items-center justify-center gap-3 rounded-xl px-4 py-7 text-center" style="border:1px dashed var(--border);background:rgb(16 16 24 / 0.5);">
    <span class="grid place-items-center rounded-full" style="width:48px;height:48px;background:var(--primary-soft);color:var(--primary);">${icon(won ? 'trophy' : 'sprout', 'w-5 h-5')}</span>
    <div class="flex flex-col gap-1.5">
      <p class="display text-xl" style="color:var(--foreground);">${won ? 'Aún sin cierres' : col.key === 'perdido' ? 'Nada perdido' : 'Terreno libre'}</p>
      <p class="max-w-xs text-sm leading-relaxed" style="color:var(--muted-foreground);">${won
        ? 'Arrastrá una oportunidad hasta acá cuando se firme: el confeti corre por nuestra cuenta.'
        : col.key === 'perdido' ? 'Ninguna oportunidad perdida en este período.' : 'No hay nada en esta etapa. Momento perfecto para sumar una oportunidad nueva.'}</p>
    </div>
    ${col.key === 'perdido' ? '' : `<button type="button" class="btn-ghost mt-1" onclick="openDealForm('${col.key}')">${won ? 'Añadir ganada' : 'Añadir oportunidad'}</button>`}
  </div>`;
}

/**
 * Renderiza el Kanban de deals en `board` (estilo del diseño nuevo).
 * opts: { stages, deals, onChange(), compact?: bool, hideLost?: bool }
 */
function renderDealKanban(board, opts = {}) {
  if (!board) return;
  _kanbanState = { stages: opts.stages || [], deals: opts.deals || [], onChange: opts.onChange || null };
  let cols = _dealStageCols(opts.stages);
  if (opts.hideLost) cols = cols.filter((c) => c.key !== 'perdido');

  const grouped = {};
  cols.forEach((c) => { grouped[c.key] = []; });
  (opts.deals || []).forEach((d) => {
    const k = d.stage || 'prospeccion';
    if (grouped[k]) grouped[k].push(d);
  });

  board.classList.add('nice-scroll', 'flex', 'gap-4', 'overflow-x-auto', 'pb-2');
  board.innerHTML = cols.map((col) => {
    const items = grouped[col.key] || [];
    const total = items.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const currency = items[0]?.currency || 'USD';
    const accent = col.celebrate ? '#a78bfa' : col.key === 'perdido' ? 'var(--muted-foreground)' : 'var(--primary)';
    return `<div class="kanban-col ${col.celebrate ? 'is-won' : ''}" data-stage="${col.key}"
        ondragover="event.preventDefault();this.classList.add('is-over');"
        ondragleave="if(!this.contains(event.relatedTarget))this.classList.remove('is-over');"
        ondrop="this.classList.remove('is-over');_kanbanDrop(event,'${col.key}')">
      <div class="flex flex-col gap-2 px-1">
        <div class="flex items-center gap-2">
          ${col.celebrate ? `<span style="color:#a78bfa;">${icon('trophy', 'w-3.5 h-3.5')}</span>` : ''}
          <span class="eyebrow" style="color:${accent};">${_escHtml(col.label)}</span>
          ${badgeHtml(String(items.length), col.celebrate ? 'violet' : 'neutral', 'sm')}
        </div>
        <p class="tnum font-data text-sm" style="color:var(--foreground);">${fmtCompact(total, currency)}</p>
      </div>
      <div class="kanban-drop-zone flex flex-col gap-2.5 nice-scroll" style="${opts.compact ? 'max-height:560px;' : 'max-height:calc(100vh - 330px);'}overflow-y:auto;min-height:60px;">
        ${items.map((d) => _dealCardHtml(d)).join('') || _kanbanEmptyHtml(col)}
      </div>
      ${col.key === 'perdido' ? '' : `<button type="button" class="kanban-add" onclick="openDealForm('${col.key}')">${icon('plus', 'w-3.5 h-3.5')} Añadir</button>`}
    </div>`;
  }).join('');
  hydrateMotion(board);
}

function _kanbanDragStart(event, dealId, fromStage) {
  event.currentTarget.classList.add('card-dragging');
  event.dataTransfer.setData('dealId', dealId);
  event.dataTransfer.setData('fromStage', fromStage);
  event.dataTransfer.effectAllowed = 'move';
  window._kanbanDragging = true;
}

async function _kanbanDrop(event, toStage) {
  event.preventDefault();
  window._kanbanDragging = false;
  const dealId = event.dataTransfer.getData('dealId');
  const fromStage = event.dataTransfer.getData('fromStage');
  if (!dealId || fromStage === toStage) return;

  const col = event.currentTarget;
  const card = document.querySelector(`.kanban-card[data-deal-id="${dealId}"]`);
  // Movimiento optimista
  const zone = col?.querySelector('.kanban-drop-zone');
  const prevParent = card?.parentElement;
  if (card && zone) {
    zone.querySelector('.kanban-empty')?.remove();
    zone.prepend(card);
    card.classList.remove('card-dragging');
  }
  if (col?.classList) {
    col.classList.remove('drop-pulse');
    void col.offsetWidth;
    col.classList.add('drop-pulse');
  }

  const stageCol = _dealStageCols(_kanbanState.stages).find((c) => c.key === toStage);
  const res = await api(`/api/deals/${dealId}/stage`, { method: 'PATCH', body: { stage: toStage } });
  if (res?.ok) {
    if (stageCol?.celebrate) {
      const r = col?.getBoundingClientRect?.();
      celebrate(r ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + 80) / window.innerHeight } : undefined);
    }
    showToast(`Etapa: ${stageCol?.label || toStage}`);
  } else {
    if (card && prevParent) prevParent.prepend(card);
    showToast(res?.error || 'Error cambiando etapa', 'error');
  }
  if (typeof _kanbanState.onChange === 'function') _kanbanState.onChange();
}

/** Form "Nueva oportunidad" (POST /api/deals, mecanismo existente). */
function openDealForm(stage = 'prospeccion') {
  const stages = _dealStageCols(_kanbanState.stages);
  openModalShell('Nueva oportunidad', 'Se guarda en Pipeline deals', `
    <div class="space-y-3">
      <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Título</label>
        <input id="df-title" class="input" placeholder="Ej. Estrategia 360 · Aura Moda"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Importe</label>
          <input id="df-value" type="number" min="0" class="input" placeholder="0"></div>
        <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Moneda</label>
          <select id="df-currency" class="input"><option>USD</option><option>ARS</option><option>EUR</option></select></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Etapa</label>
          <select id="df-stage" class="input">${stages.map((s) => `<option value="${s.key}" ${s.key === stage ? 'selected' : ''}>${_escHtml(s.label)}</option>`).join('')}</select></div>
        <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Probabilidad %</label>
          <input id="df-prob" type="number" min="0" max="100" class="input" value="25"></div>
      </div>
      <div><label class="eyebrow block mb-1.5" style="color:var(--muted-foreground);">Cierre previsto</label>
        <input id="df-close" type="date" class="input"></div>
      <div class="flex gap-2 pt-1">
        <button type="button" class="btn-primary" onclick="_submitDealForm()">Crear oportunidad</button>
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
      </div>
    </div>`);
  setTimeout(() => document.getElementById('df-title')?.focus(), 50);
}

async function _submitDealForm() {
  const title = document.getElementById('df-title')?.value?.trim();
  if (!title) { showToast('El título es obligatorio', 'error'); return; }
  const body = {
    title,
    value: Number(document.getElementById('df-value')?.value) || 0,
    currency: document.getElementById('df-currency')?.value || 'USD',
    stage: document.getElementById('df-stage')?.value || 'prospeccion',
    probability: Number(document.getElementById('df-prob')?.value) || 0,
    expected_close: document.getElementById('df-close')?.value || null,
    status: 'open',
  };
  const res = await api('/api/deals', { method: 'POST', body });
  if (res?.ok) {
    closeModal();
    showToast('Oportunidad creada');
    if (typeof _kanbanState.onChange === 'function') _kanbanState.onChange();
    else renderView(window.location.hash);
  } else {
    showToast(res?.error || 'Error creando oportunidad', 'error');
  }
}

const dealStageColors = {
  prospeccion: { color: 'var(--info)', soft: 'var(--info-soft)' },
  propuesta:   { color: '#a78bfa', soft: 'var(--accent-soft)' },
  negociacion: { color: 'var(--warning)', soft: 'var(--warning-soft)' },
  ganado:      { color: 'var(--primary)', soft: 'var(--primary-soft)' },
  perdido:     { color: 'var(--muted-foreground)', soft: 'var(--secondary)' },
};

const dealStageLabel = {
  prospeccion: 'Prospección',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  ganado: 'Ganado',
  perdido: 'Perdido',
};

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
      ${leads.map((l, i) => `
        <tr class="lead-row transition stagger-row" style="border-top:1px solid var(--border);animation-delay:${Math.min(i, 14) * 0.028}s;"
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
    sel.innerHTML = '<option value="">Sin propuestas (creá en Agentes IA → Propuestas)</option>';
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
