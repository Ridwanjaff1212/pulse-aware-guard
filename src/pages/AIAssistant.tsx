import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, Send, User, Bot, Loader2, Shield,
  AlertTriangle, Heart, Image, Sparkles, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

const QUICK_PROMPTS = [
  { icon: Shield, text: "How do I stay safe?", color: "text-primary" },
  { icon: AlertTriangle, text: "I feel unsafe", color: "text-warning" },
  { icon: Heart, text: "I need support", color: "text-destructive" },
  { icon: Image, text: "Generate safety tips image", color: "text-accent" },
];

export default function AIAssistant() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your SafePulse AI assistant. I can help you with safety concerns, provide guidance, generate safety-related images, or just chat if you need support. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Check if user wants to generate an image
    const isImageRequest = messageText.toLowerCase().includes("generate") && 
      (messageText.toLowerCase().includes("image") || messageText.toLowerCase().includes("picture"));

    try {
      if (isImageRequest) {
        setIsGeneratingImage(true);
        const { data, error } = await supabase.functions.invoke("safepulse-ai", {
          body: {
            type: "generate_image",
            data: {
              prompt: messageText,
            },
          },
        });

        if (error) throw error;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data?.message || "Here's the generated image:",
          timestamp: new Date(),
          imageUrl: data?.imageUrl,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const { data, error } = await supabase.functions.invoke("safepulse-ai", {
          body: {
            type: "chat",
            data: {
              message: messageText,
              context: "SafePulse safety assistant helping with personal safety",
            },
          },
        });

        if (error) throw error;

        const responseContent = data?.analysis?.response || 
                               data?.analysis?.raw || 
                               data?.response || 
                               "I'm here to help. Could you tell me more about your situation?";

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error("Chat error:", err);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting right now. If this is an emergency, please use the Emergency SOS feature or call emergency services directly.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: "Connection Error",
        description: "Could not connect to AI assistant.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout title="AI Safety Assistant">
      <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 animate-fade-in",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.imageUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border">
                    <img
                      src={message.imageUrl}
                      alt="Generated"
                      className="max-w-full h-auto"
                    />
                  </div>
                )}
                <p
                  className={cn(
                    "text-[10px] mt-2",
                    message.role === "user"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  {isGeneratingImage ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse text-accent" />
                      <span className="text-sm text-muted-foreground">
                        Generating image...
                      </span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Thinking...
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="pb-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt.text)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover:bg-secondary/80 transition-colors"
                >
                  <prompt.icon className={cn("h-4 w-4", prompt.color)} />
                  <span className="text-sm text-foreground">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border bg-background pt-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message or 'generate image of...'"
              className="flex-1 bg-card border-border"
              disabled={isLoading}
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            If this is an emergency, please use SOS or call emergency services
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
