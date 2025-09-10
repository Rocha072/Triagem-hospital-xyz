import { Message } from '../types';
import { cn } from '../lib/utils';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-fade-in",
        message.isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] px-4 py-3 rounded-2xl chat-message",
          message.isUser 
            ? "bg-medical-chat-user text-medical-chat-user-foreground rounded-br-md" 
            : "bg-medical-chat-ai text-medical-chat-ai-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.text}
        </p>
        <span className={cn(
          "text-xs mt-1 block opacity-70",
          message.isUser ? "text-right" : "text-left"
        )}>
          {message.timestamp.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
};