import { cn } from "@workspace/ui/lib/utils";
import { Message, Todo } from "@/lib/types";
import { Card, CardContent } from "@workspace/ui/components/card";
import { TodoPreview } from "../todos/TodoPreview";

interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  todos?: Todo[];
}

export function ChatMessage({ message, isLast, todos = [] }: ChatMessageProps) {
  const isUser = message.role === "user";
  const affectedTodos = todos.filter((todo) =>
    message.metadata?.todoIds?.includes(todo.id)
  );

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <Card
        className={cn(
          "max-w-[80%]",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          isLast && "animate-in fade-in-0 slide-in-from-bottom-5"
        )}
      >
        <CardContent className="p-3">
          <div className="prose dark:prose-invert">{message.content}</div>

          {/* Tool Calls */}
          {message.metadata?.toolCalls &&
            message.metadata.toolCalls.length > 0 && (
              <div className="mt-2 text-sm opacity-80">
                <div className="font-semibold">Tools Used:</div>
                {message.metadata.toolCalls.map((tool) => (
                  <div key={tool.id} className="ml-2">
                    • {tool.name}
                    {tool.error && (
                      <span className="text-destructive">
                        {" "}
                        (Error: {tool.error})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

          {/* Todo Previews */}
          {affectedTodos.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-sm font-semibold">
                {affectedTodos.length === 1
                  ? "1 todo affected"
                  : `${affectedTodos.length} todos affected`}
              </div>
              {affectedTodos.map((todo) => (
                <div key={todo.id} className="ml-2">
                  <TodoPreview
                    todo={todo}
                    isNew={message.metadata?.toolCalls?.some(
                      (tool) =>
                        tool.name === "createTodo" &&
                        tool.arguments.id === todo.id
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
