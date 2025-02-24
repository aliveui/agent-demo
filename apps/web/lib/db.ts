import { sql } from "@vercel/postgres";

// Test database connection
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW();`;
    return { success: true, timestamp: result.rows[0]?.now ?? null };
  } catch (error) {
    console.error("Database connection error:", error);
    return { success: false, error };
  }
}

// Create a new todo
export async function createTodo(todo: {
  content: string;
  agentType: string;
  createdBy: string;
}) {
  try {
    const id = crypto.randomUUID();
    const result = await sql`
      INSERT INTO todos (id, content, agent_type, created_by)
      VALUES (${id}, ${todo.content}, ${todo.agentType}, ${todo.createdBy})
      RETURNING *;
    `;
    return { success: true, todo: result.rows[0] };
  } catch (error) {
    console.error("Error creating todo:", error);
    return { success: false, error };
  }
}

// Get all todos for an agent
export async function getTodosByAgent(agentType: string) {
  try {
    const result = await sql`
      SELECT * FROM todos 
      WHERE agent_type = ${agentType}
      ORDER BY created_at DESC;
    `;
    return { success: true, todos: result.rows };
  } catch (error) {
    console.error("Error fetching todos:", error);
    return { success: false, error };
  }
}
