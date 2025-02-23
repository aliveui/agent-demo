import { Todo, TodoStore } from "./types";
import { v4 as uuidv4 } from "uuid";

export class InMemoryTodoStore implements TodoStore {
  private todos: Todo[] = [];

  async addTodo(
    todo: Omit<Todo, "id" | "createdAt" | "updatedAt">
  ): Promise<Todo> {
    const now = new Date().toISOString();
    const newTodo: Todo = {
      ...todo,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.todos.push(newTodo);
    return newTodo;
  }

  async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
    const index = this.todos.findIndex((todo) => todo.id === id);
    if (index === -1) {
      throw new Error(`Todo with id ${id} not found`);
    }

    const updatedTodo: Todo = {
      ...this.todos[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.todos[index] = updatedTodo;
    return updatedTodo;
  }

  async deleteTodo(id: string): Promise<void> {
    const index = this.todos.findIndex((todo) => todo.id === id);
    if (index === -1) {
      throw new Error(`Todo with id ${id} not found`);
    }
    this.todos.splice(index, 1);
  }

  async getTodo(id: string): Promise<Todo | null> {
    const todo = this.todos.find((todo) => todo.id === id);
    return todo || null;
  }

  async listTodos(): Promise<Todo[]> {
    return [...this.todos];
  }
}
