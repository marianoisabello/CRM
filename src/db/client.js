const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Node <22 no tiene WebSocket nativo — desactivar Realtime que no usamos
const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  realtime: { enabled: false },
  global: { fetch: fetch.bind(globalThis) },
});

module.exports = supabase;
