import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ResultCardData } from "../../shared/ui/ResultCard/ResultCard";

interface ChatContextValue {
  isOpen: boolean;
  isPinned: boolean;
  chatData: ResultCardData | null;
  openChat: (data: ResultCardData) => void;
  closeChat: () => void;
  togglePin: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [chatData, setChatData] = useState<ResultCardData | null>(null);

  const openChat = useCallback((data: ResultCardData) => {
    setChatData(data);
    setIsOpen(true);
    setIsPinned(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsPinned(false);
  }, []);

  const togglePin = useCallback(() => {
    setIsPinned(prev => !prev);
  }, []);

  return (
    <ChatContext.Provider value={{ isOpen, isPinned, chatData, openChat, closeChat, togglePin }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
