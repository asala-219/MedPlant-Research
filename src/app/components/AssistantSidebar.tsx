import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Bot, X, Sparkles } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

// ---------------------------------------------------------------------------
// Context — lets any page open the assistant (optionally with a preset query)
// ---------------------------------------------------------------------------
interface AssistantContextValue {
  open: boolean;
  openAssistant: (question?: string) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within <AssistantProvider>");
  return ctx;
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  // Bumping the key remounts the panel so a contextual question starts fresh.
  const [panelKey, setPanelKey] = useState(0);

  const openAssistant = useCallback((question?: string) => {
    if (question) {
      setPendingQuestion(question);
      setPanelKey((k) => k + 1);
    }
    setOpen(true);
  }, []);

  const closeAssistant = useCallback(() => setOpen(false), []);
  const toggleAssistant = useCallback(() => setOpen((o) => !o), []);

  const value = useMemo(
    () => ({ open, openAssistant, closeAssistant, toggleAssistant }),
    [open, openAssistant, closeAssistant, toggleAssistant]
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
      <AssistantWidget panelKey={panelKey} pendingQuestion={pendingQuestion} />
    </AssistantContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Floating launcher button + right-aligned slide-in panel
// ---------------------------------------------------------------------------
function AssistantWidget({
  panelKey,
  pendingQuestion,
}: {
  panelKey: number;
  pendingQuestion: string | null;
}) {
  const { open, openAssistant, closeAssistant } = useAssistant();
  const { lang } = useLang();
  const tr = t[lang];

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAssistant();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeAssistant]);

  return (
    <>
      {/* Floating launcher (hidden while the panel is open) */}
      {!open && (
        <button
          onClick={() => openAssistant()}
          aria-label={tr.nav_chat}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-600 text-white pl-4 pr-5 py-3 shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">{tr.nav_chat}</span>
        </button>
      )}

      {/* Backdrop (mobile / small screens) */}
      <div
        onClick={closeAssistant}
        className={`fixed inset-0 z-[55] bg-stone-900/30 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Right-aligned panel */}
      <aside
        role="dialog"
        aria-label={tr.chat_title}
        className={`fixed top-0 right-0 z-[60] h-screen w-full sm:w-[420px] bg-[#FBFBF9] border-l border-stone-200 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-stone-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold font-serif text-stone-900 leading-none">
                {tr.chat_title}
              </p>
              <p className="text-[10px] text-stone-400 font-medium leading-none mt-1">
                {tr.nav_subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={closeAssistant}
            aria-label="Close"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — kept mounted so the conversation persists across open/close */}
        <div className="flex-1 min-h-0">
          <ChatPanel
            key={panelKey}
            variant="sidebar"
            initialQuestion={pendingQuestion}
          />
        </div>
      </aside>
    </>
  );
}
