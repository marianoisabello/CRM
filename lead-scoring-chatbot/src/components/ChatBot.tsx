import { useState, useEffect, useRef, useCallback } from 'react'
import { LeadData, Message, InfoField } from '../types/lead'
import ScoreDisplay from './ScoreDisplay'
import SuccessMessage from './SuccessMessage'
import { supabase } from '../services/supabaseClient'

const CALENDLY_LINK = 'https://calendly.com/marianoisabello-pampai/30min'

interface InfoStep {
  field: InfoField
  question: string
  placeholder: string
  inputType?: string
}

const INFO_STEPS: InfoStep[] = [
  {
    field: 'nombre_apellido',
    question: '¡Hola! Soy Dana, tu asistente de calificación 👋\n\nEstoy aquí para conocerte mejor y ver cómo podemos ayudarte.\n\n¿Cuál es tu nombre y apellido?',
    placeholder: 'Ej: María García',
  },
  {
    field: 'empresa',
    question: '¿A qué empresa pertenecés?',
    placeholder: 'Ej: Mi Empresa S.A.',
  },
  {
    field: 'cargo',
    question: '¿Cuál es tu cargo o posición en la empresa?',
    placeholder: 'Ej: CEO, Gerente de Marketing...',
  },
  {
    field: 'email',
    question: '¿Cuál es tu email de contacto?',
    placeholder: 'tu@email.com',
    inputType: 'email',
  },
  {
    field: 'whatsapp',
    question: '¿Y tu número de WhatsApp? (con código de país)',
    placeholder: 'Ej: +54911234567',
    inputType: 'tel',
  },
  {
    field: 'web_sitio',
    question: '¿Tenés un sitio web o blog?\n(Si no tenés, escribí "No")',
    placeholder: 'Ej: www.miweb.com',
  },
  {
    field: 'red_social',
    question: '¿Cuál es tu red social principal?',
    placeholder: 'Ej: @usuario en Instagram',
  },
  {
    field: 'tamaño_negocio',
    question: '¿Cómo describirías el tamaño de tu negocio?',
    placeholder: 'Ej: Emprendimiento, PYME, Empresa mediana...',
  },
  {
    field: 'pais_ciudad',
    question: '¿De qué país y ciudad sos?',
    placeholder: 'Ej: Argentina, Buenos Aires',
  },
  {
    field: 'objetivo_necesidad',
    question: '¡Ya casi terminamos con esta parte! 🙌\n\n¿Cuál es tu objetivo o necesidad principal en este momento?',
    placeholder: 'Contame un poco...',
  },
]

const SCORING_QUESTIONS = [
  '¿Tenés un negocio activo en este momento?',
  '¿Tenés presupuesto disponible para invertir en marketing/ventas?',
  '¿Tomás decisiones directas o influís en las decisiones de compra?',
  '¿Tenés una necesidad real y urgente que necesitás resolver ahora?',
  '¿Trabajás con otros proveedores o lo hacés todo internamente?',
  '¿Estás buscando resultados en el corto plazo (próximas semanas)?',
]

const SCORING_INTRO = 'Perfecto, {nombre}! 🎯\n\nAhora te haré 6 preguntas rápidas de Sí o No para entender mejor tu situación actual.'

function calculateScore(data: Partial<LeadData>): number {
  let score = 0
  if (data.respuesta_q1) score += 10
  const hasWeb =
    data.web_sitio &&
    data.web_sitio.toLowerCase() !== 'no' &&
    data.web_sitio.trim().length > 2
  const hasSocial =
    data.red_social &&
    data.red_social.toLowerCase() !== 'no' &&
    data.red_social.trim().length > 2
  if (hasWeb || hasSocial) score += 10
  if (data.respuesta_q4) score += 20
  if (data.respuesta_q2) score += 20
  if (data.respuesta_q3) score += 20
  if (data.respuesta_q6) score += 20
  return score
}

function getCategory(score: number): 'Bajo' | 'Medio' | 'Alto' {
  if (score >= 70) return 'Alto'
  if (score >= 40) return 'Medio'
  return 'Bajo'
}

function getMessage(category: 'Bajo' | 'Medio' | 'Alto'): string {
  switch (category) {
    case 'Bajo':
      return 'Entiendo perfectamente. Aunque en este momento no parece ser el tiempo ideal, te dejamos acceso a nuestro material educativo que podría serte muy útil cuando estés listo. Nos encantaría reconectarnos en el futuro.'
    case 'Medio':
      return 'Tu perfil es realmente interesante y vemos mucho potencial. Queremos mantenernos en contacto y nutrirnos mutuamente. Te enviaremos contenido valioso cada semana.'
    case 'Alto':
      return '¡Excelente! Vemos una gran alineación entre lo que necesitás y lo que ofrecemos. Me gustaría muchísimo agendar una breve reunión para conocerte mejor. ¿Qué días te vienen bien esta semana?'
  }
}

function getRecommendation(category: 'Bajo' | 'Medio' | 'Alto'): string {
  switch (category) {
    case 'Bajo':
      return 'Nutrir con contenido educativo. Re-contactar en 3-6 meses.'
    case 'Medio':
      return 'Incluir en newsletter semanal. Monitorear interés.'
    case 'Alto':
      return 'Contacto inmediato. Agendar reunión esta semana.'
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const TOTAL_STEPS = INFO_STEPS.length + SCORING_QUESTIONS.length

function makeId() {
  return Date.now().toString() + Math.random().toString(36).slice(2)
}

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: makeId(),
      role: 'bot',
      content: INFO_STEPS[0].question,
      timestamp: new Date(),
    },
  ])
  const [step, setStep] = useState(0)
  const [leadData, setLeadData] = useState<Partial<LeadData>>({})
  const [currentInput, setCurrentInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showScore, setShowScore] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, showScore])

  useEffect(() => {
    if (!isTyping && !isSubmitted && step < INFO_STEPS.length) {
      inputRef.current?.focus()
    }
  }, [isTyping, step, isSubmitted])

  const addBotMessage = useCallback((content: string, delay = 900) => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'bot', content, timestamp: new Date() },
      ])
    }, delay)
  }, [])

  const addUserMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', content, timestamp: new Date() },
    ])
  }

  const handleInfoSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const value = currentInput.trim()
    if (!value) return

    const currentStep = INFO_STEPS[step]

    if (currentStep.inputType === 'email' && !isValidEmail(value)) {
      setInputError('Por favor ingresá un email válido.')
      return
    }

    setInputError(null)
    addUserMessage(value)
    setCurrentInput('')

    const newLeadData = { ...leadData, [currentStep.field]: value }
    setLeadData(newLeadData)

    const nextStep = step + 1

    if (nextStep < INFO_STEPS.length) {
      setTimeout(() => setStep(nextStep), 200)
      addBotMessage(INFO_STEPS[nextStep].question)
    } else {
      // Transition to scoring
      const firstName = (newLeadData.nombre_apellido || '').split(' ')[0]
      const intro = SCORING_INTRO.replace('{nombre}', firstName)
      setTimeout(() => setStep(nextStep), 200)
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: 'bot', content: intro, timestamp: new Date() },
        ])
        // First scoring question after brief pause
        setTimeout(() => {
          addBotMessage(SCORING_QUESTIONS[0], 600)
        }, 400)
      }, 1000)
    }
  }

  const handleScoringAnswer = (answer: boolean) => {
    const questionIndex = step - INFO_STEPS.length
    const key = `respuesta_q${questionIndex + 1}` as keyof LeadData
    addUserMessage(answer ? '✅ Sí' : '❌ No')

    const newLeadData = { ...leadData, [key]: answer }
    setLeadData(newLeadData)

    const nextStep = step + 1
    const nextQuestionIndex = questionIndex + 1

    if (nextQuestionIndex < SCORING_QUESTIONS.length) {
      setTimeout(() => setStep(nextStep), 200)
      addBotMessage(SCORING_QUESTIONS[nextQuestionIndex])
    } else {
      // All done — calculate and show result
      const score = calculateScore(newLeadData)
      const category = getCategory(score)
      const mensaje = getMessage(category)
      const recomendacion = getRecommendation(category)

      const finalData: Partial<LeadData> = {
        ...newLeadData,
        score_total: score,
        categoria_lead: category,
        mensaje_respuesta: mensaje,
        recomendacion,
        calendly_link: category === 'Alto' ? CALENDLY_LINK : undefined,
        source: 'chatbot',
        status: 'new',
      }
      setLeadData(finalData)

      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'bot',
            content:
              '¡Listo! Respondiste todas las preguntas. 🎉\n\nAquí está tu evaluación. Confirmá para enviar tus datos.',
            timestamp: new Date(),
          },
        ])
        setTimeout(() => {
          setStep(nextStep)
          setShowScore(true)
        }, 300)
      }, 1000)
    }
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const { error } = await supabase.from('leads').insert([leadData])
      if (error) throw error
      setIsSubmitted(true)
    } catch (err) {
      console.error(err)
      setSubmitError('Hubo un error al guardar los datos. Por favor intentá de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isInfoPhase = step < INFO_STEPS.length
  const isScoringPhase = step >= INFO_STEPS.length && step < TOTAL_STEPS
  const isConfirmPhase = step >= TOTAL_STEPS
  const currentScore = calculateScore(leadData)
  const progressPercent = Math.min(100, (step / TOTAL_STEPS) * 100)

  if (isSubmitted) {
    return <SuccessMessage leadData={leadData as LeadData} />
  }

  return (
    <div className="flex flex-col w-full sm:max-w-2xl h-screen sm:h-[90vh] sm:rounded-3xl bg-white sm:shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
            D
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Dana</p>
            <p className="text-xs text-blue-200">Asistente de Calificación · En línea</p>
          </div>
          {isScoringPhase && (
            <div className="text-right">
              <div className="text-xl font-bold">{currentScore}</div>
              <div className="text-xs text-blue-200">puntos</div>
            </div>
          )}
        </div>
        {/* Progress */}
        <div className="mt-3 bg-white/20 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-white rounded-full h-1.5 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-blue-200">Paso {Math.min(step + 1, TOTAL_STEPS)} de {TOTAL_STEPS}</span>
          <span className="text-xs text-blue-200">{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            {msg.role === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-1">
                D
              </div>
            )}
            <div
              className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
              D
            </div>
            <div className="bg-white px-4 py-3.5 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
              <div className="flex gap-1 items-center">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce-dot"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Score display after all questions */}
        {showScore && !isTyping && (
          <ScoreDisplay
            leadData={leadData as LeadData}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
            error={submitError}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {!isConfirmPhase && (
        <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-100">
          {inputError && (
            <p className="text-red-500 text-xs mb-2 px-1">{inputError}</p>
          )}

          {isInfoPhase && !isTyping && (
            <form onSubmit={handleInfoSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type={INFO_STEPS[step]?.inputType || 'text'}
                value={currentInput}
                onChange={(e) => { setCurrentInput(e.target.value); setInputError(null) }}
                placeholder={INFO_STEPS[step]?.placeholder || 'Escribí tu respuesta...'}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!currentInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white w-11 h-11 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="Enviar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </form>
          )}

          {isScoringPhase && !isTyping && (
            <div className="flex gap-3">
              <button
                onClick={() => handleScoringAnswer(true)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="text-base">✅</span> Sí
              </button>
              <button
                onClick={() => handleScoringAnswer(false)}
                className="flex-1 bg-rose-400 hover:bg-rose-500 active:scale-95 text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="text-base">❌</span> No
              </button>
            </div>
          )}

          {isTyping && (
            <div className="h-11 flex items-center justify-center">
              <p className="text-xs text-gray-400">Dana está escribiendo...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
