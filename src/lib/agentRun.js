'use strict';

const supabase = require('../db/client');
const logger = require('./logger');

/**
 * Registra y actualiza una corrida de agente en la tabla `agent_runs`.
 * Uso:
 *   const run = await AgentRun.start('sdr', { lead_id });
 *   // ... ejecutar agente ...
 *   await run.complete({ output_data, tokens_used });
 *   // o en caso de error:
 *   await run.fail(error);
 */
class AgentRun {
  constructor(record) {
    this.id = record.id;
    this.agentId = record.agent_id;
    this.startedAt = Date.now();
  }

  static async start(agentId, { leadId = null, inputData = {} } = {}) {
    const { data, error } = await supabase
      .from('agent_runs')
      .insert({
        agent_id: agentId,
        lead_id: leadId,
        input_data: inputData,
        status: 'running',
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Error iniciando AgentRun', agent: agentId, error: error.message });
      throw new Error(`Error iniciando AgentRun: ${error.message}`);
    }

    logger.info({ msg: 'AgentRun iniciado', runId: data.id, agent: agentId, leadId });
    return new AgentRun(data);
  }

  async complete({ outputData = {}, tokensUsed = null } = {}) {
    const durationMs = Date.now() - this.startedAt;

    const { error } = await supabase
      .from('agent_runs')
      .update({
        status: 'completed',
        output_data: outputData,
        tokens_used: tokensUsed,
        duration_ms: durationMs,
      })
      .eq('id', this.id);

    if (error) {
      logger.error({ msg: 'Error completando AgentRun', runId: this.id, error: error.message });
    }

    logger.info({ msg: 'AgentRun completado', runId: this.id, agent: this.agentId, durationMs });
  }

  async fail(err) {
    const durationMs = Date.now() - this.startedAt;
    const message = err instanceof Error ? err.message : String(err);

    const { error } = await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error: message,
        duration_ms: durationMs,
      })
      .eq('id', this.id);

    if (error) {
      logger.error({ msg: 'Error marcando AgentRun como fallido', runId: this.id, error: error.message });
    }

    logger.warn({ msg: 'AgentRun fallido', runId: this.id, agent: this.agentId, error: message });
  }
}

module.exports = AgentRun;
