import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Leaf, RefreshCw } from "lucide-react";
import { api } from "../../api/client";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const SUGGESTIONS_EN = [
  "What plants treat diabetes in Oman?",
  "Which plants contain Thymol?",
  "What are plants used for skin disorders?",
  "Tell me about Boswellia sacra",
  "Which plant family has the most species?",
];

const SUGGESTIONS_AR = [
  "ما النباتات التي تعالج السكري في عُمان؟",
  "ما النباتات التي تحتوي على الثيمول؟",
  "ما النباتات المستخدمة لأمراض الجلد؟",
  "أخبرني عن اللبان العُماني",
  "ما العائلة النباتية الأكثر تنوعاً؟",
];

export function Chat() {
  const { lang } = useLang();
  const tr = t[lang];
  const suggestions = lang === "ar" ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setInput("");
    setLastUserMessage(msg);
    setLoading(true);

    try {
      const history = newMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const { reply } = await api.chat(msg, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const isOverload = detail.includes("503") || detail.toLowerCase().includes("unavailable") || detail.toLowerCase().includes("high demand");
      const errorText = isOverload
        ? "The AI model is temporarily busy (high demand). Please retry in a moment."
        : `Error: ${detail}`;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorText, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 pb-24 flex flex-col" style={{ minHeight: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-emerald-600 mb-1">
          Phase 5 — GraphRAG Chatbot
        </h2>
        <h1 className="text-3xl font-serif font-bold text-stone-900">{tr.chat_title}</h1>
        <p className="text-stone-500 mt-1">{tr.chat_subtitle}</p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-800">
        <Leaf className="w-4 h-4 shrink-0 mt-0.5" />
        <p>{tr.chat_disclaimer}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col gap-4 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-stone-600 font-medium mb-1">Ask anything about Oman's ethnomedicinal plants</p>
              <p className="text-stone-400 text-sm">Try one of these questions:</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-sm bg-white border border-stone-200 rounded-xl px-4 py-2 text-stone-700 hover:border-emerald-400 hover:text-emerald-700 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-tr-sm whitespace-pre-wrap"
                  : msg.error
                  ? "bg-amber-50 border border-amber-200 text-amber-800 rounded-tl-sm"
                  : "bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm prose prose-sm prose-stone max-w-none"
              }`}
            >
              {msg.role === "user" ? (
                msg.content
              ) : msg.error ? (
                <div className="flex flex-col gap-2">
                  <p>{msg.content}</p>
                  {lastUserMessage && (
                    <button
                      onClick={() => {
                        setMessages((prev) => prev.slice(0, -1));
                        sendMessage(lastUserMessage);
                      }}
                      className="flex items-center gap-1.5 self-start text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  )}
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
                    em: ({ children }) => <em className="italic text-stone-700">{children}</em>,
                    h1: ({ children }) => <h1 className="text-base font-bold text-stone-900 mt-3 mb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-bold text-stone-900 mt-3 mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-stone-800 mt-2 mb-1">{children}</h3>,
                    code: ({ children }) => <code className="bg-stone-100 text-emerald-700 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-emerald-300 pl-3 text-stone-500 italic">{children}</blockquote>,
                    hr: () => <hr className="border-stone-200 my-2" />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-4 h-4 text-stone-500" />
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 bg-stone-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-4 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-2xl shadow-lg p-2 flex gap-2">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none px-3 py-2 text-sm text-stone-800 bg-transparent focus:outline-none placeholder:text-stone-400"
          placeholder={tr.chat_placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{ maxHeight: 120 }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </main>
  );
}
