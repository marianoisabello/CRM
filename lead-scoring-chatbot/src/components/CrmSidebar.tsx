const CRM_BASE = 'https://crm-murex-tau.vercel.app'

type NavLink = {
  label: string
  href: string
  kind: 'item' | 'sub'
  icon?: 'dashboard' | 'leads' | 'sdr' | 'analyst' | 'proposal' | 'performance' | 'reporting' | 'pipeline' | 'calendar' | 'chat' | 'settings'
  active?: boolean
  external?: boolean
}

const ICON_PATHS: Record<NonNullable<NavLink['icon']>, string> = {
  dashboard:
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  leads:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  sdr: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  analyst: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  proposal:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  performance: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  reporting:
    'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  pipeline:
    'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
  calendar:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  chat: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  settings:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
}

function crmHash(hash: string) {
  return `${CRM_BASE}/app.html#${hash}`
}

/** Same Marketing Dana sidebar as CRM `public/app.html` (context.md). */
export default function CrmSidebar() {
  const sections: Array<{ title?: string; links: NavLink[] }> = [
    {
      links: [{ label: 'Dashboard', href: crmHash('dashboard'), kind: 'item', icon: 'dashboard' }],
    },
    {
      title: 'Leads',
      links: [
        { label: 'Todos', href: crmHash('leads'), kind: 'item', icon: 'leads' },
        { label: 'Formulario web', href: crmHash('leads/web_form'), kind: 'sub' },
        { label: 'ManyChat', href: crmHash('leads/manychat'), kind: 'sub' },
        { label: 'Instagram', href: crmHash('leads/instagram'), kind: 'sub' },
        { label: 'WhatsApp', href: crmHash('leads/whatsapp'), kind: 'sub' },
        { label: 'LinkedIn', href: crmHash('leads/linkedin'), kind: 'sub' },
        { label: 'Email', href: crmHash('leads/email'), kind: 'sub' },
        { label: 'Importación', href: crmHash('leads/database_import'), kind: 'sub' },
      ],
    },
    {
      title: 'Agentes IA',
      links: [
        { label: 'SDR', href: crmHash('agent/sdr'), kind: 'item', icon: 'sdr' },
        { label: 'Analista', href: crmHash('agent/analyst'), kind: 'item', icon: 'analyst' },
        { label: 'Menú · Propuestas', href: crmHash('propuestas'), kind: 'sub' },
        { label: 'Propuestas IA', href: crmHash('agent/proposal'), kind: 'item', icon: 'proposal' },
        { label: 'Performance', href: crmHash('agent/performance'), kind: 'item', icon: 'performance' },
        { label: 'Reporting', href: crmHash('agent/reporting'), kind: 'item', icon: 'reporting' },
      ],
    },
    {
      title: 'Herramientas',
      links: [
        { label: 'Pipeline', href: crmHash('pipeline'), kind: 'item', icon: 'pipeline' },
        { label: 'Calendario', href: crmHash('calendar'), kind: 'item', icon: 'calendar' },
        { label: 'Chatbot Scoring', href: '#', kind: 'item', icon: 'chat', active: true },
        { label: 'Configuración', href: crmHash('settings'), kind: 'item', icon: 'settings' },
      ],
    },
  ]

  return (
    <aside
      className="w-56 min-h-screen flex flex-col fixed left-0 top-0 z-30 hidden md:flex"
      style={{ background: '#1A1D23', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="px-4 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 text-white"
          style={{ background: '#2563EB' }}
        >
          D
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight truncate text-white">Marketing Dana</p>
          <p className="text-xs leading-tight" style={{ color: 'rgb(107,114,128)' }}>
            Agentes IA
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="text-[10px] uppercase tracking-[0.1em] px-2.5 mt-4 mb-1" style={{ color: 'rgb(75,85,99)' }}>
                {section.title}
              </p>
            )}
            {section.links.map((link) => {
              const base =
                link.kind === 'sub'
                  ? 'flex items-center gap-2 py-1.5 px-2.5 pl-7 rounded-md text-xs select-none transition'
                  : 'flex items-center gap-2 py-1.5 px-2.5 rounded-md text-[13px] select-none transition'
              const colors = link.active
                ? 'text-[#93C5FD] bg-[rgba(37,99,235,0.2)] border border-[rgba(37,99,235,0.3)]'
                : link.kind === 'sub'
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'

              const content = (
                <>
                  {link.icon && (
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.75"
                        d={ICON_PATHS[link.icon]}
                      />
                      {link.icon === 'settings' && (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.75"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      )}
                    </svg>
                  )}
                  {link.label}
                </>
              )

              if (link.active) {
                return (
                  <div key={link.label} className={`${base} ${colors}`} aria-current="page">
                    {content}
                  </div>
                )
              }

              return (
                <a
                  key={link.label}
                  href={link.href}
                  className={`${base} ${colors}`}
                  {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {content}
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      <div
        className="px-3 py-3 flex items-center gap-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
          style={{ background: '#2563EB' }}
        >
          D
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate text-white">Marketing Dana</p>
          <a
            href={`${CRM_BASE}/app.html`}
            className="text-xs truncate hover:underline"
            style={{ color: 'rgb(107,114,128)' }}
          >
            Abrir CRM
          </a>
        </div>
      </div>
    </aside>
  )
}
