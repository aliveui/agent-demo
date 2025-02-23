"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { toast } from "sonner";

interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  category?: string;
}

interface TodoListProps {
  agentType: string;
}

export default function TodoList({ agentType }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTodos = async () => {
    if (agentType !== "vercel") return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/vercel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "List all my todos" }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch todos");
      }

      const data = await response.json();
      console.log("Agent response:", data.response);

      try {
        // First try to find a JSON array in the response
        const matches = data.response.match(/\[.*\]/s);
        if (matches) {
          const todoList = JSON.parse(matches[0]);
          if (Array.isArray(todoList)) {
            console.log("Found todo list:", todoList);
            setTodos(todoList);
            return;
          }
        }

        // If no array found, try to parse the entire response
        const parsed = JSON.parse(data.response);
        if (Array.isArray(parsed)) {
          console.log("Parsed todo list:", parsed);
          setTodos(parsed);
          return;
        }

        if (parsed.todos && Array.isArray(parsed.todos)) {
          console.log("Found todos in object:", parsed.todos);
          setTodos(parsed.todos);
          return;
        }

        console.error("Unexpected response format:", data.response);
        toast.error("Unexpected response format from agent");
      } catch (parseError) {
        console.error("Parse error:", parseError);
        console.error("Response data:", data.response);
        toast.error("Failed to parse todos from agent response");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch todos");
    } finally {
      setIsLoading(false);
    }
  };

  // Set up polling to keep the todo list updated
  useEffect(() => {
    fetchTodos();
    const interval = setInterval(fetchTodos, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [agentType]);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todo List</CardTitle>
        <CardDescription>
          Use the chat to manage your todos. Try saying "Create a new todo" or
          "List all todos"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {isLoading && todos.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Loading todos...
              </div>
            ) : todos.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No todos yet. Use the chat to create one!
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    todo.completed ? "bg-muted" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-base font-medium ${
                            todo.completed
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {todo.title}
                        </span>
                        <span
                          className={`text-xs font-medium ${getPriorityColor(todo.priority)}`}
                        >
                          {todo.priority}
                        </span>
                        {todo.completed && (
                          <span className="text-xs font-medium text-green-600">
                            completed
                          </span>
                        )}
                      </div>
                      {todo.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {todo.description}
                        </p>
                      )}
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {todo.category && (
                          <span className="flex items-center">
                            <span className="mr-1">📁</span>
                            {todo.category}
                          </span>
                        )}
                        {todo.dueDate && (
                          <span className="flex items-center">
                            <span className="mr-1">📅</span>
                            {new Date(todo.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
