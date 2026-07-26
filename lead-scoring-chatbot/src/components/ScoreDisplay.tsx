import { LeadData } from '../types/lead'

interface Props {
  leadData: LeadData
  onConfirm: () => void
  isSubmitting: boolean
  error: string | null
}

const CATEGORY_CONFIG = {
  Bajo: {
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    ringColor: '#f97316',
    icon: '📉',
    label: 'Bajo Potencial',
  },
  Medio: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-700',
    ringColor: '#eab308',
    icon: '📊',
    label: 'Potencial Medio',
  },
  Alto: {
    color: 'text-green-500',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    ringColor: '#22c55e',
    icon: '🚀',
    label: 'Alto Potencial',
  },
}

export default function ScoreDisplay({ leadData, onConfirm, isSubmitting, error }: Props) {
  const { score_total, categoria_lead, mensaje_respuesta, calendly_link } = leadData
  const config = CATEGORY_CONFIG[categoria_lead]
  const circumference = 2 * Math.PI * 36
  const progress = (score_total / 100) * circumference

  return (
    <div className={`w-full rounded-2xl border-2 ${config.border} ${config.bg} p-5 animate-slide-up space-y-4`}>
      {/* Score ring */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="36" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="44"
              cy="44"
              r="36"
              fill="none"
              stroke={config.ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              strokeDashoffset={circumference / 4}
              transform="rotate(-90 44 44)"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${config.color}`}>{score_total}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>

        <div className="flex-1">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${config.badgeBg} ${config.badgeText} mb-2`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{mensaje_respuesta}</p>
        </div>
      </div>

      {/* Calendly button for Alto */}
      {categoria_lead === 'Alto' && calendly_link && (
        <a
          href={calendly_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl text-sm transition-colors"
        >
          📅 Agendar reunión en Calendly
        </a>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Guardando...
          </>
        ) : (
          '✓ Confirmar y enviar mis datos'
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Tus datos se guardarán de forma segura y te contactaremos pronto.
      </p>
    </div>
  )
}
