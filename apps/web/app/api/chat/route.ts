import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Message } from "@/lib/types";
import { systemPrompt, modelConfig } from "@/lib/agents/vercel/config";
import { createTodo } from "@/lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { message, agentType } = await req.json();

    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    // Format messages for OpenAI
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage.content },
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      messages,
      ...modelConfig,
    });

    const response = completion.choices[0]?.message;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const toolCalls = response.function_call ? [response.function_call] : [];

    // Handle tool calls
    let todoId: string | undefined;
    if (response.function_call) {
      const args = JSON.parse(response.function_call.arguments);
      switch (response.function_call.name) {
        case "createTodo":
          const result = await createTodo({
            content: args.content,
            agentType,
            createdBy: "agent",
          });
          if (result.success && result.todo) {
            todoId = result.todo.id;
          }
          break;
        default:
          throw new Error(`Unknown function: ${response.function_call.name}`);
      }
    }

    // Create assistant message
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response.content ?? "",
      timestamp: new Date(),
      metadata: {
        toolCalls: toolCalls.map((call) => ({
          id: crypto.randomUUID(),
          type: "function",
          name: call.name,
          arguments: call.arguments,
        })),
        todoIds: todoId ? [todoId] : [],
      },
    };

    return NextResponse.json({
      success: true,
      message: assistantMessage,
    });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process message",
      },
      { status: 500 }
    );
  }
}
