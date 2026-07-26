export interface LeadData {
  nombre_apellido: string
  empresa: string
  cargo: string
  email: string
  whatsapp: string
  web_sitio: string
  red_social: string
  tamaño_negocio: string
  pais_ciudad: string
  objetivo_necesidad: string
  respuesta_q1: boolean
  respuesta_q2: boolean
  respuesta_q3: boolean
  respuesta_q4: boolean
  respuesta_q5: boolean
  respuesta_q6: boolean
  score_total: number
  categoria_lead: 'Bajo' | 'Medio' | 'Alto'
  mensaje_respuesta: string
  recomendacion: string
  calendly_link?: string
  source: 'chatbot'
  status: 'new'
}

export interface Message {
  id: string
  role: 'bot' | 'user'
  content: string
  timestamp: Date
}

export type InfoField = keyof Pick<
  LeadData,
  | 'nombre_apellido'
  | 'empresa'
  | 'cargo'
  | 'email'
  | 'whatsapp'
  | 'web_sitio'
  | 'red_social'
  | 'tamaño_negocio'
  | 'pais_ciudad'
  | 'objetivo_necesidad'
>
