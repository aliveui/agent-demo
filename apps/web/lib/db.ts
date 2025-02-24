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

// Create a custom error type for database operations
export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// Helper to format errors consistently
function formatDbError(operation: string, error: unknown): DatabaseError {
  console.error(`Database error during ${operation}:`, error);
  return new DatabaseError(
    error instanceof Error ? error.message : `Error during ${operation}`,
    operation,
    error
  );
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
    throw formatDbError("createTodo", error);
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

// Find todos by similar content
export async function findTodoByContent(content: string, agentType: AgentType) {
  try {
    // Normalize the search content
    const normalizedContent = content.trim().toLowerCase();

    // Extract key words (remove common words)
    const stopWords = [
      "a",
      "an",
      "the",
      "to",
      "and",
      "or",
      "in",
      "on",
      "at",
      "by",
      "for",
    ];
    const keyWords = normalizedContent
      .split(/\s+/)
      .filter((word) => word.length > 1 && !stopWords.includes(word));

    // If we don't have any meaningful words, use the original content
    const searchTerms = keyWords.length > 0 ? keyWords : [normalizedContent];

    console.log(`Search terms extracted: ${searchTerms.join(", ")}`);

    // Build dynamic query parts for each search term
    const whereClauses = [];
    const params: any[] = [agentType];
    let paramIndex = 2;

    // Add direct content matches first
    whereClauses.push(`(content ILIKE $${paramIndex})`);
    params.push(`%${normalizedContent}%`);
    paramIndex++;

    // Add individual word matches
    for (const term of searchTerms) {
      if (term.length >= 3) {
        // Only use meaningful words
        whereClauses.push(`(content ILIKE $${paramIndex})`);
        params.push(`%${term}%`);
        paramIndex++;
      }
    }

    // Build the final query with safe escaping for the CASE expressions
    const matchRankCases = searchTerms
      .map((_, i) => {
        if (i + 3 < paramIndex) {
          // Only include if we added this param
          return `WHEN content ILIKE $${i + 3} THEN ${i + 2}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n          ");

    const query = `
      SELECT *, 
        CASE
          WHEN content ILIKE $2 THEN 1  -- Partial phrase match
          ${matchRankCases}
          ELSE 100
        END as match_rank
      FROM todos 
      WHERE agent_type = $1 
        AND (${whereClauses.join(" OR ")})
      ORDER BY 
        CASE 
          WHEN content = $2 THEN 0  -- Exact match (using parameter instead of string literal)
          WHEN content ILIKE $2 || '%' THEN 1  -- Starts with match
          ELSE match_rank  -- Other match types
        END,
        match_rank,
        created_at DESC
      LIMIT 5;`;

    console.log("Executing content search query");

    const result = await sql.query(query, params);

    // Calculate a score between 0-1 based on match rank (lower rank = higher score)
    // This helps maintain consistency with the semantic matching
    const todos = result.rows.map((todo) => {
      // Convert match_rank (lower is better) to a score between 0-1 (higher is better)
      const score = todo.match_rank <= 10 ? (10 - todo.match_rank) / 10 : 0;
      return {
        ...todo,
        score,
      };
    });

    // Sort by score descending
    todos.sort((a, b) => b.score - a.score);

    const exactMatch = todos.some(
      (todo) => todo.content.toLowerCase() === normalizedContent
    );

    // If we have an exact match, give it a perfect score
    if (exactMatch && todos.length > 0) {
      todos[0].score = 1.0;
    }

    return {
      success: true,
      todos,
      exactMatch,
      matchedTerms: searchTerms,
      matchMethod: "word",
      bestScore: todos.length > 0 ? todos[0].score : 0,
    };
  } catch (error) {
    console.error("Error finding todo by content:", error);
    return { success: false, error };
  }
}

// Get a todo by ID
export async function getTodoById(id: string) {
  try {
    const result = await sql.query(
      `SELECT * FROM todos 
       WHERE id = $1
       LIMIT 1;`,
      [id]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Todo not found" };
    }

    return { success: true, todo: result.rows[0] };
  } catch (error) {
    console.error("Error getting todo by ID:", error);
    return { success: false, error };
  }
}

// Find todos by semantic similarity
export async function findTodoBySemanticMatch(
  content: string,
  agentType: AgentType
) {
  try {
    // Ensure PostgreSQL has the pg_trgm extension for similarity functions
    // This should be done once during database setup
    await sql.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // Normalize the search content
    const normalizedContent = content.trim().toLowerCase();

    // Query using both word similarity and trigram similarity functions
    const result = await sql.query(
      `SELECT *,
        similarity(lower(content), $2) as semantic_score,
        content <-> $2 as distance
       FROM todos 
       WHERE agent_type = $1
       ORDER BY 
         semantic_score DESC,
         distance ASC,
         created_at DESC
       LIMIT 5;`,
      [agentType, normalizedContent]
    );

    // We'll consider a match "good" if it has at least 0.3 similarity score
    const goodMatches = result.rows.filter(
      (todo) => todo.semantic_score >= 0.3
    );

    return {
      success: true,
      todos: goodMatches.length > 0 ? goodMatches : result.rows,
      bestScore: result.rows.length > 0 ? result.rows[0].semantic_score : 0,
      exactMatch: result.rows.some(
        (todo) => todo.content.toLowerCase() === normalizedContent
      ),
    };
  } catch (error) {
    console.error("Error finding todo by semantic match:", error);
    return { success: false, error };
  }
}

// Enhanced function that combines word-level and semantic matching
export async function findTodoByContentEnhanced(
  content: string,
  agentType: AgentType
) {
  try {
    // Try word-level matching first
    const wordResults = await findTodoByContent(content, agentType);

    // If we found good matches with word-level search, return those
    if (
      wordResults.success &&
      wordResults.todos &&
      wordResults.todos.length > 0
    ) {
      return wordResults;
    }

    // Otherwise, try semantic matching
    console.log("No word matches found, trying semantic matching");
    const semanticResults = await findTodoBySemanticMatch(content, agentType);

    if (semanticResults.success) {
      return {
        ...semanticResults,
        matchMethod: "semantic", // Add a flag indicating we used semantic matching
        matchedTerms: [content],
      };
    }

    // If all else fails, return the original word results
    return wordResults;
  } catch (error) {
    console.error("Error in enhanced content matching:", error);
    return { success: false, error };
  }
}
