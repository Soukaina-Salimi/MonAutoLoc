"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  ArrowRight,
  Loader2,
  Minimize2,
  Maximize2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
  timestamp: Date;
  logId?: number | null; // ← ajouter
}

interface ChatbotContext {
  page?:
    | "owner"
    | "vehicule"
    | "bagages"
    | "livraison"
    | "demenagement"
    | "general";
  ownerId?: number;
  ownerName?: string;
  vehiculeId?: number;
  vehiculeName?: string;
  serviceType?: string;
}

interface ChatbotWidgetProps {
  context?: ChatbotContext;
}

interface Suggestion {
  label: string;
  url: string;
  type: "vehicules" | "service";
}
// Utilisateur connecté (à récupérer depuis le contexte ou localStorage)
interface CurrentUser {
  id: number;
  name: string;
  email: string;
}

const SUGGESTED_QUESTIONS = [
  "Quels véhicules sont disponibles à Casablanca ?",
  "Avez-vous des véhicules avec chauffeur ?",
  "Comment réserver un véhicule ?",
  "Quels services de transport proposez-vous ?",
];

export default function ChatbotWidget({ context }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNewMsg, setHasNewMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastLogId, setLastLogId] = useState<number | null>(null);
  // Ajouter au début du composant
  const [sessionId, setSessionId] = useState<string>(() => {
    // Récupérer ou générer un session_id persistant
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("chatbot_session");
      if (stored) return stored;
      const newId = crypto.randomUUID();
      sessionStorage.setItem("chatbot_session", newId);
      return newId;
    }
    return "";
  });
  // Récupérer l'utilisateur connecté
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser({ id: user.id, name: user.name, email: user.email });
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  }, []);
  // Message de bienvenue
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let welcomeMsg =
        "Bonjour ! 👋 Je suis l'assistant AutoRent. Comment puis-je vous aider ?";
      let suggestions: Suggestion[] = [
        { label: "Voir les véhicules", url: "/vehicules", type: "vehicules" },
        { label: "Services de transport", url: "/bagages", type: "service" },
      ];

      if (context?.page === "owner" && context.ownerName) {
        welcomeMsg = `Bonjour ! 👋 Je peux vous renseigner sur les véhicules de **${context.ownerName}**. Que souhaitez-vous savoir ?`;
        suggestions = [
          {
            label: `Véhicules de ${context.ownerName}`,
            url: `/owners/${context.ownerId}`,
            type: "vehicules",
          },
        ];
      } else if (context?.page === "vehicule" && context.vehiculeName) {
        welcomeMsg = `Bonjour ! 👋 Vous regardez le **${context.vehiculeName}**. Des questions sur ce véhicule ?`;
        suggestions = [
          {
            label: "Voir les disponibilités",
            url: `/vehicules/${context.vehiculeId}`,
            type: "vehicules",
          },
        ];
      } else if (context?.page === "bagages") {
        welcomeMsg =
          "Bonjour ! 👋 Je peux vous aider à trouver un prestataire pour votre transport de bagages.";
        suggestions = [
          { label: "Voir les prestataires", url: "/bagages", type: "service" },
        ];
      }

      setMessages([
        {
          role: "assistant",
          content: welcomeMsg,
          suggestions,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input à l'ouverture
  useEffect(() => {
    if (isOpen && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, minimized]);

  async function sendMessage(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = {
      role: "user",
      content: msg,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Construire l'historique (sans le dernier message user)
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data } = await api.post("/agent/chat", {
        message: msg,
        history,
        context: context || { page: "general" },
        session_id: sessionId,
        user_id: currentUser?.id || null, // si connecté
      });

      const botMsg: Message = {
        role: "assistant",
        content: data.response,
        suggestions: data.suggestions || [],
        timestamp: new Date(),
        logId: data.log_id || null, // ← stocker le log_id par message
      };
      setMessages((prev) => [...prev, botMsg]);
      setLastLogId(data.log_id || null); // ← assigner lastLogId

      if (!isOpen || minimized) setHasNewMsg(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Désolé, je rencontre une erreur. Veuillez réessayer.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function openChat() {
    setIsOpen(true);
    setMinimized(false);
    setHasNewMsg(false);
  }

  // Hors de sendMessage — au niveau du composant
  async function sendFeedback(logId: number, helpful: boolean) {
    if (!logId) return;
    try {
      await api.patch(`/chat-logs/${logId}/feedback`, {
        was_helpful: helpful,
      });
    } catch {}
  }
  const serviceColors: Record<string, string> = {
    vehicules: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    service: "bg-teal-100 text-teal-700 hover:bg-teal-200",
  };

  return (
    <>
      {/* ── Bubble ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openChat}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center"
          >
            <MessageCircle className="w-6 h-6 text-white" />
            {hasNewMsg && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Panel ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[370px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
            style={{ maxHeight: minimized ? "64px" : "560px" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">
                    Assistant AutoRent
                  </p>
                  <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                    En ligne
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMinimized((v) => !v)}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  {minimized ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                  style={{ minHeight: "300px", maxHeight: "380px" }}
                >
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-blue-600 to-purple-600"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <User className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-blue-600" />
                        )}
                      </div>

                      <div
                        className={`flex flex-col gap-1.5 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                      >
                        {/* Bulle */}
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm"
                              : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* Suggestions */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {msg.suggestions.map((s, si) => (
                              <Link
                                key={si}
                                href={s.url}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${serviceColors[s.type] || "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                              >
                                {s.label}
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            ))}
                          </div>
                        )}
                        {msg.role === "assistant" && i > 0 && msg.logId && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => sendFeedback(msg.logId!, true)}
                              className="text-xs text-gray-400 hover:text-green-500 transition"
                            >
                              👍
                            </button>
                            <button
                              onClick={() => sendFeedback(msg.logId!, false)}
                              className="text-xs text-gray-400 hover:text-red-500 transition"
                            >
                              👎
                            </button>
                          </div>
                        )}

                        {/* Timestamp */}
                        <span className="text-xs text-gray-400">
                          {msg.timestamp.toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {loading && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm">
                        <div className="flex gap-1 items-center">
                          <span
                            className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Questions suggérées — si conversation vide */}
                {messages.length <= 1 && !loading && (
                  <div className="px-4 py-2 border-t border-gray-100 bg-white shrink-0">
                    <p className="text-xs text-gray-400 mb-2">
                      Questions fréquentes :
                    </p>
                    <div className="flex flex-col gap-1">
                      {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(q)}
                          className="text-left text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition flex items-center gap-1.5"
                        >
                          <ArrowRight className="w-3 h-3 shrink-0" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-gray-100 bg-white shrink-0">
                  <div className="flex gap-2 items-center bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Posez votre question…"
                      maxLength={500}
                      disabled={loading}
                      className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none disabled:opacity-50"
                    />

                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || loading}
                      className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center disabled:opacity-40 transition hover:shadow-md shrink-0"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  </div>
                  <p className="text-center text-xs text-gray-300 mt-1.5">
                    Propulsé par IA · Les données sensibles sont protégées
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
