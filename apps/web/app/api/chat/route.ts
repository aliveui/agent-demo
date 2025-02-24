import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Message } from "@/lib/types";
import { systemPrompt, modelConfig } from "@/lib/agents/vercel/config";
import { createTodo, updateTodo, deleteTodo, listTodos } from "@/lib/db";

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
    let todoIds: string[] = [];
    let error: string | undefined;

    if (response.function_call) {
      const args = JSON.parse(response.function_call.arguments);
      try {
        switch (response.function_call.name) {
          case "createTodo": {
            const result = await createTodo({
              content: args.content,
              agentType,
              createdBy: "agent",
              priority: args.priority,
              labels: args.labels,
              complexity: args.complexity,
            });
            if (result.success && result.todo) {
              todoIds.push(result.todo.id);
            } else {
              error = "Failed to create todo";
            }
            break;
          }
          case "updateTodo": {
            const result = await updateTodo({
              id: args.id,
              content: args.content,
              completed: args.completed,
              priority: args.priority,
              labels: args.labels,
              complexity: args.complexity,
            });
            if (result.success && result.todo) {
              todoIds.push(result.todo.id);
            } else {
              error = result.error?.toString() || "Failed to update todo";
            }
            break;
          }
          case "deleteTodo": {
            const result = await deleteTodo(args.id);
            if (result.success) {
              todoIds.push(args.id);
            } else {
              error = result.error?.toString() || "Failed to delete todo";
            }
            break;
          }
          case "listTodos": {
            const result = await listTodos({
              agentType,
              completed: args.completed,
              priority: args.priority,
              labels: args.labels,
            });
            if (result.success && result.todos) {
              todoIds = result.todos.map((todo) => todo.id);
            } else {
              error = "Failed to list todos";
            }
            break;
          }
          default:
            error = `Unknown function: ${response.function_call.name}`;
        }
      } catch (err) {
        console.error("Error executing tool:", err);
        error = err instanceof Error ? err.message : "Tool execution failed";
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
          error: error,
        })),
        todoIds,
        error,
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
