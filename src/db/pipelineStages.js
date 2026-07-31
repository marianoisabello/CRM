'use strict';

const supabase = require('./client');

async function listStages({ activeOnly = true } = {}) {
  let query = supabase.from('pipeline_stages').select('*').order('position', { ascending: true });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw new Error(`Error listando pipeline_stages: ${error.message}`);
  return data || [];
}

async function getStageByKey(key) {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(`Error obteniendo stage: ${error.message}`);
  return data;
}

module.exports = { listStages, getStageByKey };
