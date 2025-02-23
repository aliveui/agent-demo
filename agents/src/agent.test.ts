import { describe, it, expect, beforeEach } from "@jest/globals";
import { TodoAgent } from "./agent";
import { InMemoryTodoStore } from "./store";
import { Todo } from "./types";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

describe("TodoAgent", () => {
  let agent: TodoAgent;
  let store: InMemoryTodoStore;

  beforeEach(() => {
    store = new InMemoryTodoStore();
    agent = new TodoAgent(store, process.env.OPENAI_API_KEY || "");
  });

  it("should create a todo", async () => {
    const message =
      'Create a high priority todo titled "Test todo" with description "This is a test"';
    const response = await agent.processMessage(message);

    const todos = await store.listTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      title: "Test todo",
      description: "This is a test",
      priority: "high",
      completed: false,
    });
  });

  it("should list todos", async () => {
    await store.addTodo({
      title: "Test todo",
      description: "This is a test",
      priority: "high",
      completed: false,
    });

    const message = "List all my todos";
    const response = await agent.processMessage(message);
    expect(response).toContain("Test todo");
  });

  it("should update a todo", async () => {
    const todo = await store.addTodo({
      title: "Test todo",
      description: "This is a test",
      priority: "high",
      completed: false,
    });

    const message = `Update the todo with ID ${todo.id} to be marked as completed`;
    const response = await agent.processMessage(message);

    const updatedTodo = await store.getTodo(todo.id);
    expect(updatedTodo?.completed).toBe(true);
  });

  it("should delete a todo", async () => {
    const todo = await store.addTodo({
      title: "Test todo",
      description: "This is a test",
      priority: "high",
      completed: false,
    });

    const message = `Delete the todo with ID ${todo.id}`;
    const response = await agent.processMessage(message);

    const todos = await store.listTodos();
    expect(todos).toHaveLength(0);
  });
});
