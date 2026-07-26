import { LeadData } from '../types/lead'

const CATEGORY_CONFIG = {
  Bajo: { icon: '📚', color: 'text-orange-500', bg: 'from-orange-50 to-amber-50' },
  Medio: { icon: '📬', color: 'text-yellow-500', bg: 'from-yellow-50 to-amber-50' },
  Alto: { icon: '🎉', color: 'text-green-500', bg: 'from-green-50 to-emerald-50' },
}

export default function SuccessMessage({ leadData }: { leadData: LeadData }) {
  const config = CATEGORY_CONFIG[leadData.categoria_lead]
  const firstName = leadData.nombre_apellido.split(' ')[0]

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.bg} p-4`}>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-slide-up space-y-5">
        <div className="text-6xl">{config.icon}</div>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            ¡Gracias, {firstName}!
          </h1>
          <p className="text-gray-500 text-sm">Tu información fue registrada exitosamente.</p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Score</span>
            <span className={`text-lg font-bold ${config.color}`}>{leadData.score_total} / 100</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Categoría</span>
            <span className={`text-sm font-semibold ${config.color}`}>{leadData.categoria_lead} Potencial</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm text-gray-700">{leadData.email}</span>
          </div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed">{leadData.mensaje_respuesta}</p>

        {leadData.categoria_lead === 'Alto' && leadData.calendly_link && (
          <a
            href={leadData.calendly_link}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            📅 Agendar mi reunión
          </a>
        )}

        <div className="text-xs text-gray-400 pt-2">
          Nos pondremos en contacto pronto. ¡Gracias por tu tiempo!
        </div>
      </div>
    </div>
  )
}
