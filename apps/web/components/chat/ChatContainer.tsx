import { useRef, useEffect } from "react";
import { Message, Todo } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2, History } from "lucide-react";

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  error?: string | null;
  todos?: Todo[];
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  error = null,
  todos = [],
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-background">
      <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/20">
        <h3 className="text-sm font-medium">Chat with Agent</h3>
        {messages.length > 0 && (
          <div className="flex items-center text-xs text-muted-foreground">
            <History className="h-3 w-3 mr-1" />
            <span>Context-aware ({messages.length} messages)</span>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>Start chatting with the agent.</p>
              <p className="text-xs mt-2">Try saying:</p>
              <ul className="text-xs mt-1 space-y-1">
                <li>"Create a todo to buy groceries"</li>
                <li>"I've completed walking the dog"</li>
                <li>"Delete the grocery shopping task"</li>
                <li>"Show me all my tasks"</li>
              </ul>
            </div>
          )}
          {messages.map((message, i) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLast={i === messages.length - 1}
              todos={todos}
            />
          ))}
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {error && (
            <div className="p-4 text-sm text-destructive bg-destructive/10 rounded">
              Error: {error}
            </div>
          )}
        </div>
      </ScrollArea>
      <ChatInput
        onSend={onSendMessage}
        isLoading={isLoading}
        placeholder="Ask the agent to help with your todos..."
      />
    </div>
  );
}
