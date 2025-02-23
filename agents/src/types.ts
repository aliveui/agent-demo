import { z } from "zod";

export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  category: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Todo = z.infer<typeof TodoSchema>;

export type TodoAction =
  | { type: "CREATE"; payload: Omit<Todo, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE"; payload: Partial<Todo> & { id: string } }
  | { type: "DELETE"; payload: { id: string } }
  | { type: "COMPLETE"; payload: { id: string } }
  | { type: "UNCOMPLETE"; payload: { id: string } };

export interface TodoStore {
  addTodo: (
    todo: Omit<Todo, "id" | "createdAt" | "updatedAt">
  ) => Promise<Todo>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<Todo>;
  deleteTodo: (id: string) => Promise<void>;
  getTodo: (id: string) => Promise<Todo | null>;
  listTodos: () => Promise<Todo[]>;
}
