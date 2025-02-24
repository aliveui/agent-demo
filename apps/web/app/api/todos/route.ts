import { NextResponse } from "next/server";
import { testConnection, createTodo } from "@/lib/db";

// Test database connection
export async function GET() {
  const result = await testConnection();
  return NextResponse.json(result);
}

// Create a new todo
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createTodo({
      content: body.content,
      agentType: body.agentType,
      createdBy: body.createdBy,
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
