import OpenAI from "openai";
import { Message } from "@/lib/types";
import { systemPrompt, modelConfig, formatMessages } from "./config";
import { sql } from "@vercel/postgres";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function vercelAgent(messages: Message[]) {
  try {
    if (messages.length === 0) {
      throw new Error("No messages provided");
    }

    const startTime = Date.now();
    const interactionId = crypto.randomUUID();
    const lastMessage = messages[messages.length - 1];

    // Format messages and add system prompt
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...formatMessages(messages),
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      messages: formattedMessages as any,
      ...modelConfig,
    });

    const response = completion.choices[0]?.message;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const toolCalls = response.function_call ? [response.function_call] : [];

    // Create response message
    const responseMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response.content ?? "",
      timestamp: new Date(),
      metadata: {
        toolCalls: toolCalls.map((call) => ({
          id: crypto.randomUUID(),
          type: "function",
          name: call.name,
          arguments: JSON.parse(call.arguments || "{}"),
        })),
        todoIds: [],
      },
    };

    // Record interaction
    await sql`
      INSERT INTO agent_interactions (
        id, agent_type, user_input, agent_output,
        duration, success, todo_ids, tools_used,
        planning_steps
      ) VALUES (
        ${interactionId},
        'vercel',
        ${lastMessage.content},
        ${responseMessage.content},
        ${Date.now() - startTime},
        ${true},
        ${JSON.stringify([])},
        ${JSON.stringify(toolCalls)},
        ${JSON.stringify({
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          tokens: completion.usage,
        })}
      )
    `;

    return {
      success: true,
      message: responseMessage,
    };
  } catch (error) {
    console.error("Error in Vercel agent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    };
  }
}
