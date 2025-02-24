import { sql } from "@vercel/postgres";
import { Todo, AgentType } from "@/lib/types";

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
  priority?: number;
  labels?: string[];
  complexity?: number;
}) {
  try {
    const id = crypto.randomUUID();
    const result = await sql.query(
      `INSERT INTO todos (
        id, content, agent_type, created_by,
        priority, labels, complexity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;`,
      [
        id,
        todo.content,
        todo.agentType,
        todo.createdBy,
        todo.priority ?? 0,
        Array.isArray(todo.labels) ? todo.labels : [],
        todo.complexity ?? 0,
      ]
    );
    return { success: true, todo: result.rows[0] };
  } catch (error) {
    console.error("Error creating todo:", error);
    return { success: false, error };
  }
}

// Update a todo
export async function updateTodo(todo: {
  id: string;
  content?: string;
  completed?: boolean;
  priority?: number;
  labels?: string[];
  complexity?: number;
}) {
  try {
    const setFields = [];
    const values: any[] = [todo.id];
    let valueIndex = 2;

    if (todo.content !== undefined) {
      setFields.push(`content = $${valueIndex}`);
      values.push(todo.content);
      valueIndex++;
    }
    if (todo.completed !== undefined) {
      setFields.push(`completed = $${valueIndex}`);
      values.push(String(todo.completed));
      valueIndex++;
    }
    if (todo.priority !== undefined) {
      setFields.push(`priority = $${valueIndex}`);
      values.push(String(todo.priority));
      valueIndex++;
    }
    if (todo.labels !== undefined) {
      setFields.push(`labels = $${valueIndex}::jsonb`);
      values.push(JSON.stringify(todo.labels));
      valueIndex++;
    }
    if (todo.complexity !== undefined) {
      setFields.push(`complexity = $${valueIndex}`);
      values.push(String(todo.complexity));
      valueIndex++;
    }

    if (setFields.length === 0) {
      return { success: false, error: "No fields to update" };
    }

    setFields.push("updated_at = CURRENT_TIMESTAMP");

    const result = await sql.query(
      `UPDATE todos SET ${setFields.join(", ")} WHERE id = $1 RETURNING *;`,
      values
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Todo not found" };
    }

    return { success: true, todo: result.rows[0] };
  } catch (error) {
    console.error("Error updating todo:", error);
    return { success: false, error };
  }
}

// Delete a todo
export async function deleteTodo(id: string) {
  try {
    const result = await sql`
      DELETE FROM todos
      WHERE id = ${id}
      RETURNING id;
    `;

    if (result.rowCount === 0) {
      return { success: false, error: "Todo not found" };
    }

    return { success: true, id };
  } catch (error) {
    console.error("Error deleting todo:", error);
    return { success: false, error };
  }
}

// List todos with optional filters
export async function listTodos(filters?: {
  agentType?: AgentType;
  completed?: boolean;
  priority?: number;
  labels?: string[];
}) {
  try {
    let conditions = [];
    let values: any[] = [];
    let valueIndex = 1;

    if (filters) {
      if (filters.agentType !== undefined) {
        conditions.push(`agent_type = $${valueIndex}`);
        values.push(filters.agentType);
        valueIndex++;
      }
      if (filters.completed !== undefined) {
        conditions.push(`completed = $${valueIndex}`);
        values.push(String(filters.completed));
        valueIndex++;
      }
      if (filters.priority !== undefined) {
        conditions.push(`priority = $${valueIndex}`);
        values.push(String(filters.priority));
        valueIndex++;
      }
      if (filters.labels && filters.labels.length > 0) {
        conditions.push(`labels ?| $${valueIndex}`);
        values.push(filters.labels);
        valueIndex++;
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await sql.query(
      `SELECT * FROM todos ${whereClause} ORDER BY created_at DESC;`,
      values
    );

    return { success: true, todos: result.rows };
  } catch (error) {
    console.error("Error listing todos:", error);
    return { success: false, error };
  }
}
