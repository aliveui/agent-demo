import { NextResponse } from "next/server";
import { Message, AgentType } from "@/lib/types";
import { sql } from "@vercel/postgres";

export async function POST(request: Request) {
  try {
    const { message, agentType } = await request.json();

    // Create a new interaction record
    const interactionId = crypto.randomUUID();
    const startTime = Date.now();

    // TODO: Implement actual agent interaction
    // For now, just echo the message
    const response: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Echo: ${message} (from ${agentType} agent)`,
      timestamp: new Date(),
      metadata: {
        toolCalls: [],
        todoIds: [],
      },
    };

    // Record the interaction
    await sql`
      INSERT INTO agent_interactions (
        id, agent_type, user_input, agent_output,
        duration, success, todo_ids, tools_used
      ) VALUES (
        ${interactionId},
        ${agentType},
        ${message},
        ${response.content},
        ${Date.now() - startTime},
        ${true},
        ${JSON.stringify([])},
        ${JSON.stringify([])}
      )
    `;

    return NextResponse.json({ success: true, message: response });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process message" },
      { status: 500 }
    );
  }
}
