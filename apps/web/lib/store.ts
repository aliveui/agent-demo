import { create } from "zustand";
import { AgentType, Message, Todo } from "@/lib/types";

interface TodoStore {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
  filter: "all" | "completed" | "pending";
  setFilter: (filter: "all" | "completed" | "pending") => void;
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  toggleComplete: (id: string, completed: boolean) => void;
  fetchTodos: (agentType: AgentType) => Promise<void>;
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,
  filter: "all",

  setFilter: (filter: "all" | "completed" | "pending") => set({ filter }),

  setTodos: (todos: Todo[]) => set({ todos }),

  addTodo: (todo: Todo) =>
    set((state) => ({
      todos: [todo, ...state.todos],
    })),

  updateTodo: (id: string, updates: Partial<Todo>) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, ...updates } : todo
      ),
    })),

  deleteTodo: (id: string) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),

  toggleComplete: (id: string, completed: boolean) => {
    const { updateTodo } = get();
    updateTodo(id, { completed });
  },

  fetchTodos: async (agentType: AgentType) => {
    set({ isLoading: true, error: null });
    try {
      const url = new URL("/api/todos", window.location.origin);
      url.searchParams.set("agentType", agentType);

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.todos) {
        set({ todos: data.todos, isLoading: false });
      } else {
        throw new Error(data.error || "Failed to fetch todos");
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },
}));

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  activeAgent: AgentType;
  setActiveAgent: (agent: AgentType) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  activeAgent: "vercel",

  setActiveAgent: (activeAgent: AgentType) => {
    set({ activeAgent, messages: [] });
    const { fetchTodos } = useTodoStore.getState();
    fetchTodos(activeAgent);
  },

  addMessage: (message: Message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages: Message[]) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  sendMessage: async (content: string) => {
    const { activeAgent, messages } = get();
    set({ isLoading: true, error: null });

    try {
      // Create user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      // Add user message
      set((state) => ({
        messages: [...state.messages, userMessage],
      }));

      // Send to API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          agentType: activeAgent,
          messages: messages,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      // Add assistant message
      set((state) => ({
        messages: [...state.messages, data.message],
        isLoading: false,
      }));

      // Update todos if needed
      if (data.message.metadata?.todoIds?.length) {
        const { fetchTodos } = useTodoStore.getState();
        fetchTodos(activeAgent);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },
}));
