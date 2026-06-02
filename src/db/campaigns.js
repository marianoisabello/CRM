'use strict';

const supabase = require('./client');

async function savePerformanceReport({ period_since, period_until, client_id, analysis, actions_pending_approval }) {
  const { data, error } = await supabase
    .from('performance_reports')
    .insert({
      period_since,
      period_until,
      client_id,
      analysis,
      actions_pending_approval,
      status: actions_pending_approval?.length > 0 ? 'pending_approval' : 'done',
    })
    .select()
    .single();

  if (error) throw new Error(`Error guardando PerformanceReport: ${error.message}`);
  return data;
}

async function getMonthlyMetrics(clientId, since, until) {
  // Combina datos de leads + performance reports del período para el reporte mensual
  const [leadsResult, reportsResult] = await Promise.all([
    supabase
      .from('leads')
      .select('id, source, classification, status, score, created_at')
      .gte('created_at', since)
      .lte('created_at', until),

    supabase
      .from('performance_reports')
      .select('analysis, period_since, period_until')
      .eq('client_id', clientId)
      .gte('period_since', since)
      .lte('period_until', until),
  ]);

  if (leadsResult.error) throw new Error(`Error obteniendo leads para métricas: ${leadsResult.error.message}`);

  return {
    leads: {
      total: leadsResult.data?.length || 0,
      by_source: groupBy(leadsResult.data || [], 'source'),
      by_classification: groupBy(leadsResult.data || [], 'classification'),
      by_status: groupBy(leadsResult.data || [], 'status'),
    },
    ad_performance: reportsResult.data || [],
  };
}

async function saveMonthlyReport({ client_id, month, report, status }) {
  const { data, error } = await supabase
    .from('monthly_reports')
    .insert({ client_id, month, report, status })
    .select()
    .single();

  if (error) throw new Error(`Error guardando reporte mensual: ${error.message}`);
  return data;
}

async function approveMonthlyReport(id) {
  const { data, error } = await supabase
    .from('monthly_reports')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error aprobando reporte: ${error.message}`);
  return data;
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const val = item[key] || 'unknown';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

module.exports = { savePerformanceReport, getMonthlyMetrics, saveMonthlyReport, approveMonthlyReport };
