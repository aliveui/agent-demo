import { NextResponse } from "next/server";
import { testConnection, createTodo, listTodos } from "@/lib/db";
import { AgentType } from "@/lib/types";

// Test database connection
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType") as AgentType | null;
    const todoIds = searchParams.get("todoIds")?.split(",").filter(Boolean);

    if (!agentType) {
      return NextResponse.json(
        { success: false, error: "Agent type is required" },
        { status: 400 }
      );
    }

    const result = await listTodos({
      agentType,
      ...(todoIds && todoIds.length > 0 ? { todoIds } : {}),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/todos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list todos" },
      { status: 500 }
    );
  }
}

// Create a new todo
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createTodo({
      content: body.content,
      agentType: body.agentType,
      createdBy: body.createdBy,
      priority: body.priority,
      labels: body.labels,
      complexity: body.complexity,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/todos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create todo" },
      { status: 500 }
    );
  }
}
