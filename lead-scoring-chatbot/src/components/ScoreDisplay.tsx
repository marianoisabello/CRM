import { LeadData } from '../types/lead'

interface Props {
  leadData: LeadData
  onConfirm: () => void
  isSubmitting: boolean
  error: string | null
}

export default function ScoreDisplay({ leadData, onConfirm, isSubmitting, error }: Props) {
  const { mensaje_respuesta } = leadData

  return (
    <div className="w-full rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-5 animate-slide-up space-y-4">
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-gray-800">
          ¡Listo! Revisá tu información
        </h3>
        <p className="text-gray-700 text-sm leading-relaxed">{mensaje_respuesta}</p>
      </div>

      {error && (
        <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}

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
