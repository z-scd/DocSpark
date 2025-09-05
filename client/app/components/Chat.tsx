"use client";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as React from "react";

interface Docs {
  pageContent?: string;
  metadata?: {
    loc: number;
  };
  source?: string;
}

interface IMessage {
  role: "assitant" | "user";
  content?: string;
  documents?: string[];
}

const ChatComponent: React.FC = () => {
  const [message, setMessage] = React.useState<string>("");
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const handleSendChatMessage = async () => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    const res = await fetch(`http://localhost:8000/chat?message=${message}`);
    const data = await res.json();
    console.log(data);
    setMessages((prev) => [
      ...prev,
      {
        role: "assitant",
        content: data?.message?.kwargs?.content,
        documents: data?.docs,
      },
    ]);
  };

  return (
    <div className="p-4">
      <Message from="user">
        <MessageContent>
          {messages.map((message, index) => (
            <pre key={index}>{JSON.stringify(message?.content, null, 2)}</pre>
          ))}
        </MessageContent>
      </Message>
      <div className="fixed bottom-4 flex gap-3">
        <Input
          placeholder="Enter your query"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button disabled={!message.trim()} onClick={handleSendChatMessage}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatComponent;
