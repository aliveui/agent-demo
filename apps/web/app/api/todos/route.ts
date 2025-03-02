import { NextResponse } from "next/server";
import { testConnection, createTodo, listTodos, updateTodo } from "@/lib/db";
import { AgentType } from "@/lib/types";

// Helper function to validate API key
const validateApiKey = (req: Request) => {
  const apiKey = req.headers.get("X-OpenAI-Key") || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          success: false,
          error:
            "OpenAI API key is required. Please provide it in the request headers or set it in the environment variables.",
        },
        { status: 401 }
      ),
    };
  }

  // Set API key for OpenAI client
  process.env.OPENAI_API_KEY = apiKey;

  return { valid: true };
};

// Test database connection
export async function GET(request: Request) {
  try {
    // Validate API key
    const keyValidation = validateApiKey(request);
    if (!keyValidation.valid) {
      return keyValidation.response;
    }

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
    // Validate API key
    const keyValidation = validateApiKey(request);
    if (!keyValidation.valid) {
      return keyValidation.response;
    }

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

// Update a todo
export async function PUT(request: Request) {
  try {
    // Validate API key
    const keyValidation = validateApiKey(request);
    if (!keyValidation.valid) {
      return keyValidation.response;
    }

    const body = await request.json();
    const result = await updateTodo({
      id: body.id,
      completed: body.completed,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in PUT /api/todos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update todo" },
      { status: 500 }
    );
  }
}
