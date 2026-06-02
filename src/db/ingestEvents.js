const supabase = require('./client');

/**
 * Guarda el payload crudo ANTES de intentar normalizar.
 * Siempre devuelve el evento guardado; nunca lanza.
 */
async function createIngestEvent(source, rawPayload) {
  const { data, error } = await supabase
    .from('ingest_events')
    .insert({
      source,
      raw_payload: rawPayload,
      processed: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Error guardando IngestEvent: ${error.message}`);
  return data;
}

async function markProcessed(id) {
  const { error } = await supabase
    .from('ingest_events')
    .update({ processed: true, error: null })
    .eq('id', id);

  if (error) throw new Error(`Error marcando IngestEvent como procesado: ${error.message}`);
}

async function markFailed(id, errorMessage) {
  const { error } = await supabase
    .from('ingest_events')
    .update({ processed: false, error: errorMessage })
    .eq('id', id);

  if (error) throw new Error(`Error marcando IngestEvent como fallido: ${error.message}`);
}

/**
 * Devuelve todos los eventos sin procesar (para reprocesamiento).
 */
async function getUnprocessed() {
  const { data, error } = await supabase
    .from('ingest_events')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error obteniendo eventos sin procesar: ${error.message}`);
  return data;
}

module.exports = { createIngestEvent, markProcessed, markFailed, getUnprocessed };
