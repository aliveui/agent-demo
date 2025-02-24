import { useRef, useEffect } from "react";
import { Message } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2 } from "lucide-react";

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  error = null,
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
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLast={i === messages.length - 1}
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
