// ---------- src/ui/chat/ChatRoot.tsx ----------
import { useChat } from "@/shared/hooks/useChat";
import { useRef, useEffect } from "react";
import { MessageItem } from "./MessageItem";
import { type Chat } from "../../background/db";

export function ChatRoot({ videoId }: { videoId: string }) {
  const { messages, send, isLoading, error } = useChat(videoId);
  const input = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);
  
  return (
    <div className="w-80 h-96 flex flex-col bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-2 border-b bg-blue-50">
        <h3 className="font-semibold text-sm">LearnFlow Chat Assistant</h3>
        <span className="text-xs text-gray-500">Powered by Gemini</span>
      </div>
      
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-3 py-2">
          <p className="text-xs text-red-600">
            <span className="font-medium">Connection Error:</span> {error}
          </p>
          <button 
            className="text-xs text-blue-600 mt-1 underline"
            onClick={() => {
              // Try reestablishing connection with offscreen document
              chrome.runtime.sendMessage({ action: "RECONNECT_OFFSCREEN" });
            }}
          >
            Try to reconnect
          </button>
        </div>
      )}
      
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {messages.length === 0 && !error && (
          <div className="text-center text-gray-500 text-sm py-4">
            <p>Start a conversation with the AI assistant.</p>
            <p className="text-xs mt-1">Ask about the video content!</p>
          </div>
        )}
        
        {messages.map((m: Chat) => (
          <MessageItem key={m.id} role={m.role} text={m.message} />
        ))}
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
          </div>
        )}
        
        <div ref={bottom}></div>
      </div>
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const val = input.current?.value.trim();
          if (val && !isLoading) {
            send(val);
            input.current!.value = "";
          }
        }}
        className="p-2 border-t flex items-center"
      >
        <input 
          ref={input} 
          className="flex-1 border rounded px-3 py-1.5 text-sm" 
          placeholder="Ask about this video..."
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={`ml-2 px-3 py-1.5 rounded text-sm font-medium ${
            isLoading 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
