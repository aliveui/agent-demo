import { sql } from "@vercel/postgres";
import { AgentType, Message } from "./types";

export interface MetricsData {
  responseTime: number;
  success: boolean;
  tokenUsage?: number;
  memoryUsage?: number;
  todoSuccessCount?: number;
  todoFailCount?: number;
}

/**
 * Track agent interaction metrics
 */
export async function trackInteraction(
  agentType: AgentType,
  userInput: string,
  agentOutput: Message,
  metrics: MetricsData
) {
  try {
    const id = crypto.randomUUID();

    // Extract tool usage
    const toolsUsed = agentOutput.metadata?.toolCalls || [];
    const todoIds = agentOutput.metadata?.todoIds || [];
    const planningSteps = agentOutput.metadata?.plan;

    // Calculate duration (ms)
    const duration = metrics.responseTime;

    // Insert interaction record
    await sql.query(
      `INSERT INTO agent_interactions (
        id, agent_type, user_input, agent_output, 
        duration, success, todo_ids, planning_steps, tools_used,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        agentType,
        userInput,
        agentOutput.content,
        duration,
        metrics.success,
        todoIds.length > 0 ? todoIds : null,
        planningSteps ? JSON.stringify(planningSteps) : null,
        toolsUsed.length > 0 ? JSON.stringify(toolsUsed) : null,
        new Date(),
      ]
    );

    // Increment agent metrics
    await updateAgentMetrics(agentType, metrics);

    return { success: true, id };
  } catch (error) {
    console.error("Error tracking interaction:", error);
    return { success: false, error };
  }
}

/**
 * Update aggregate metrics for an agent
 */
async function updateAgentMetrics(agentType: AgentType, metrics: MetricsData) {
  try {
    // Get existing metrics or create new
    const { rows } = await sql.query(
      `SELECT * FROM agent_metrics 
       WHERE agent_type = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [agentType]
    );

    const existing = rows[0];
    const id = crypto.randomUUID();

    if (existing) {
      // Update existing metrics
      const interactionCount = (existing.interaction_count || 0) + 1;
      const todoSuccess =
        (existing.todo_success || 0) + (metrics.todoSuccessCount || 0);
      const todoFailed =
        (existing.todo_failed || 0) + (metrics.todoFailCount || 0);

      // Calculate rolling averages
      const successRate =
        (existing.success_rate * (interactionCount - 1) +
          (metrics.success ? 1 : 0)) /
        interactionCount;
      const responseTime =
        (existing.response_time * (interactionCount - 1) +
          metrics.responseTime) /
        interactionCount;

      // Update metrics
      await sql.query(
        `INSERT INTO agent_metrics (
          id, agent_type, response_time, success_rate, 
          interaction_count, todo_success, todo_failed,
          memory_usage, token_usage, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          agentType,
          responseTime,
          successRate,
          interactionCount,
          todoSuccess,
          todoFailed,
          metrics.memoryUsage || null,
          metrics.tokenUsage || null,
          new Date(),
        ]
      );
    } else {
      // Create new metrics
      await sql.query(
        `INSERT INTO agent_metrics (
          id, agent_type, response_time, success_rate, 
          interaction_count, todo_success, todo_failed,
          memory_usage, token_usage, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          agentType,
          metrics.responseTime,
          metrics.success ? 1 : 0,
          1,
          metrics.todoSuccessCount || 0,
          metrics.todoFailCount || 0,
          metrics.memoryUsage || null,
          metrics.tokenUsage || null,
          new Date(),
        ]
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating agent metrics:", error);
    return { success: false, error };
  }
}

/**
 * Get metrics for all agents
 */
export async function getAgentMetrics() {
  try {
    const { rows } = await sql.query(
      `SELECT 
        agent_type,
        ROUND(AVG(response_time)::numeric, 2) as avg_response_time,
        ROUND(AVG(success_rate)::numeric, 2) as avg_success_rate,
        SUM(interaction_count) as total_interactions,
        SUM(todo_success) as total_todo_success,
        SUM(todo_failed) as total_todo_failed,
        ROUND(AVG(memory_usage)::numeric, 2) as avg_memory_usage,
        ROUND(AVG(token_usage)::numeric, 2) as avg_token_usage
      FROM agent_metrics
      GROUP BY agent_type`
    );

    return { success: true, metrics: rows };
  } catch (error) {
    console.error("Error getting agent metrics:", error);
    return { success: false, error };
  }
}
