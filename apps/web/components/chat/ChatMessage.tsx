import { cn } from "@workspace/ui/lib/utils";
import { Message } from "@/lib/types";
import { Card, CardContent } from "@workspace/ui/components/card";

interface ChatMessageProps {
  message: Message;
  isLast: boolean;
}

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const isUser = message.role === "user";

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
          {message.metadata?.toolCalls && (
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
          {message.metadata?.todoIds && message.metadata.todoIds.length > 0 && (
            <div className="mt-2 text-sm opacity-80">
              <div className="font-semibold">Affected Todos:</div>
              <div className="ml-2">
                • {message.metadata.todoIds.length} todo(s) modified
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
