'use strict';

const supabase = require('./client');

async function savePerformanceReport({ period_since, period_until, client_id, analysis, actions_pending_approval, channels }) {
  const row = {
    period_since,
    period_until,
    client_id: client_id || null,
    analysis,
    actions_pending_approval,
    status: actions_pending_approval?.length > 0 ? 'pending_approval' : 'done',
  };
  if (Array.isArray(channels) && channels.length) {
    row.channels = channels;
  }

  const { data, error } = await supabase
    .from('performance_reports')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Error guardando PerformanceReport: ${error.message}`);
  return data;
}

async function listPerformanceReports({ limit = 50, offset = 0, status } = {}) {
  let query = supabase
    .from('performance_reports')
    .select('id, client_id, period_since, period_until, analysis, actions_pending_approval, status, approved_at, created_at, channels, clients(id, company, status)')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`Error listando performance reports: ${error.message}`);
  return data || [];
}

async function getPerformanceReport(id) {
  const { data, error } = await supabase
    .from('performance_reports')
    .select('*, clients(id, company, status, monthly_budget, services)')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Error obteniendo performance report: ${error.message}`);
  return data;
}

async function approvePerformanceReport(id) {
  const { data, error } = await supabase
    .from('performance_reports')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error aprobando performance report: ${error.message}`);
  return data;
}

async function getMonthlyMetrics(clientId, since, until) {
  // Combina datos de leads + performance reports del período para el reporte mensual
  const [leadsResult, reportsResult] = await Promise.all([
    supabase
      .from('leads')
      .select('id, source, classification, status, score, created_at')
      .gte('created_at', since)
      .lte('created_at', `${until}T23:59:59.999Z`),

    supabase
      .from('performance_reports')
      .select('analysis, period_since, period_until, status')
      .gte('period_since', since)
      .lte('period_until', until),
  ]);

  if (leadsResult.error) throw new Error(`Error obteniendo leads para métricas: ${leadsResult.error.message}`);

  let clientReports = reportsResult.data || [];
  if (clientId) {
    const { data: scoped } = await supabase
      .from('performance_reports')
      .select('analysis, period_since, period_until, status')
      .eq('client_id', clientId)
      .gte('period_since', since)
      .lte('period_until', until);
    if (scoped) clientReports = scoped;
  }

  const channelRollup = aggregateChannelsFromReports(clientReports);

  return {
    leads: {
      total: leadsResult.data?.length || 0,
      by_source: groupBy(leadsResult.data || [], 'source'),
      by_classification: groupBy(leadsResult.data || [], 'classification'),
      by_status: groupBy(leadsResult.data || [], 'status'),
    },
    ad_performance: clientReports,
    channels: channelRollup,
  };
}

/** Agrega canales citados en analysis de performance reports del período */
function aggregateChannelsFromReports(reports) {
  const byChannel = {};
  for (const r of reports || []) {
    const a = r.analysis || {};
    const ids = Array.isArray(a.channels_analyzed) && a.channels_analyzed.length
      ? a.channels_analyzed.map((c) => (typeof c === 'string' ? c : c.id)).filter(Boolean)
      : Object.keys(a.metrics_snapshot || {});
    for (const id of ids) {
      if (!byChannel[id]) byChannel[id] = { channel: id, reports: 0, alerts: 0 };
      byChannel[id].reports += 1;
    }
    for (const alert of a.alerts || []) {
      const ch = alert.channel || 'unspecified';
      if (!byChannel[ch]) byChannel[ch] = { channel: ch, reports: 0, alerts: 0 };
      byChannel[ch].alerts += 1;
    }
    for (const row of a.channel_breakdown || []) {
      const id = row.channel;
      if (!id) continue;
      if (!byChannel[id]) byChannel[id] = { channel: id, reports: 0, alerts: 0 };
      if (row.highlight) byChannel[id].last_highlight = row.highlight;
    }
  }
  return Object.values(byChannel);
}

async function saveMonthlyReport({ client_id, month, report, status }) {
  const { data: existing } = await supabase
    .from('monthly_reports')
    .select('id')
    .eq('client_id', client_id)
    .eq('month', month)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from('monthly_reports')
      .update({ report, status, approved_at: null })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error(`Error actualizando reporte mensual: ${error.message}`);
    return data;
  }

  const { data, error } = await supabase
    .from('monthly_reports')
    .insert({ client_id, month, report, status })
    .select()
    .single();

  if (error) throw new Error(`Error guardando reporte mensual: ${error.message}`);
  return data;
}

async function listMonthlyReports({ limit = 50, offset = 0, status, client_id } = {}) {
  let query = supabase
    .from('monthly_reports')
    .select('id, client_id, month, report, status, approved_at, created_at, clients(id, company, status)')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq('status', status);
  if (client_id) query = query.eq('client_id', client_id);

  const { data, error } = await query;
  if (error) throw new Error(`Error listando monthly reports: ${error.message}`);
  return data || [];
}

async function getMonthlyReport(id) {
  const { data, error } = await supabase
    .from('monthly_reports')
    .select('*, clients(id, company, status, monthly_budget, services, leads(name, email))')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Error obteniendo monthly report: ${error.message}`);
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

async function markMonthlyReportSent(id) {
  const { data, error } = await supabase
    .from('monthly_reports')
    .update({ status: 'sent' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error marcando reporte enviado: ${error.message}`);
  return data;
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const val = item[key] || 'unknown';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

module.exports = {
  savePerformanceReport,
  listPerformanceReports,
  getPerformanceReport,
  approvePerformanceReport,
  getMonthlyMetrics,
  saveMonthlyReport,
  listMonthlyReports,
  getMonthlyReport,
  approveMonthlyReport,
  markMonthlyReportSent,
};
