import React, { useState, useEffect } from "react";
import { BrainCircuit, Send, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

interface Tip {
  category: string;
  text: string;
  impact: string;
}

interface ChatMessage {
  sender: "user" | "advisor";
  text: string;
  isAi?: boolean;
}

interface AIAdvisorProps {
  userId: string;
  triggerRefresh: boolean;
}

export default function AIAdvisor({ userId, triggerRefresh }: AIAdvisorProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loadingTips, setLoadingTips] = useState(true);
  const [advisorInfo, setAdvisorInfo] = useState({ model: "", isAi: false });

  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: "advisor",
      text: "Hello! I am your EcoTrack AI Advisor. Ask me anything about scaling down your carbon footprint, green options, or home energy drops!",
      isAi: true,
    },
  ]);
  const [sendingChat, setSendingChat] = useState(false);

  // Fetch carbon-aware tips
  useEffect(() => {
    async function loadTips() {
      try {
        setLoadingTips(true);
        const res = await fetch("/api/ai/tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) throw new Error("Failed to load recommendations");
        const data = await res.json();
        setTips(data.tips || []);
        setAdvisorInfo({
          model: data.modelUsed || "Expert Engine",
          isAi: !!data.isAiGenerated,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTips(false);
      }
    }
    if (userId) {
      loadTips();
    }
  }, [userId, triggerRefresh]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || sendingChat) return;

    const userText = chatMessage.trim();
    setChatMessage("");
    setChatHistory((prev) => [...prev, { sender: "user", text: userText }]);
    setSendingChat(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: userText }),
      });
      if (!res.ok) throw new Error("Advisor timed out. Please try again.");
      const data = await res.json();

      setChatHistory((prev) => [
        ...prev,
        {
          sender: "advisor",
          text: data.response,
          isAi: !!data.isAiGenerated,
        },
      ]);
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "advisor",
          text: "My neural grids are experiencing heavy weather cycles. Swapping an old appliance makes my lines instantly clearer!",
        },
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Tips Panel */}
      <div className="glass-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2ecc71]/10 text-eco rounded-xl">
              <Sparkles className="w-5 h-5 text-eco glow-icon" />
            </div>
            <div>
              <h3 className="text-md font-bold text-white tracking-tight flex items-center gap-2">
                AI Carbon Advisor Recommendations
              </h3>
              <p className="text-slate-400 text-xs">Tailored targets calculated on your current usage metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/40 border border-white/10 text-[10px] font-mono text-eco">
            <span className="w-1.5 h-1.5 bg-eco rounded-full animate-ping"></span>
            {advisorInfo.model ? `Engine: ${advisorInfo.model}` : "Analyzing..."}
          </div>
        </div>

        {loadingTips ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <RefreshCw className="w-7 h-7 text-eco animate-spin" />
            <p className="text-slate-400 text-xs font-mono">Running carbon optimization formulas...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-[#2ecc71]/20 hover:bg-slate-900/70 transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-lg tracking-wider uppercase mt-0.5 shrink-0 ${
                      tip.category === "Transport"
                        ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        : tip.category === "Energy"
                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        : tip.category === "Food"
                        ? "bg-[#2ecc71]/10 text-eco border border-[#2ecc71]/20"
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}
                  >
                    {tip.category}
                  </span>
                  <div>
                    <p className="text-slate-200 text-sm leading-snug group-hover:text-white transition-colors">
                      {tip.text}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 rounded-lg bg-[#2ecc71]/10 border border-[#2ecc71]/20 text-xs font-mono text-eco font-semibold uppercase">
                    {tip.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live AI Consultative Console */}
      <div className="glass-card shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-slate-900/60 border-b border-white/10 flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-eco glow-icon" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Interactive Sustainability Sandbox</h3>
            <p className="text-slate-400 text-xs">Troubleshoot custom carbon dilemmas with your smart model</p>
          </div>
        </div>

        {/* Messages feed */}
        <div className="p-6 h-64 overflow-y-auto space-y-4 flex flex-col">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[#2ecc71] text-slate-950 font-semibold self-end rounded-tr-none"
                  : "bg-slate-800/80 border border-white/5 text-slate-200 self-start rounded-tl-none font-sans"
              }`}
            >
              <p>{msg.text}</p>
              {msg.sender === "advisor" && (
                <span className="block mt-1.5 text-[9px] text-slate-400 font-mono">
                  Advisor • {msg.isAi ? "Gemini-3.5" : "Expert Engine"}
                </span>
              )}
            </div>
          ))}
          {sendingChat && (
            <div className="flex items-center gap-2 self-start bg-slate-800/80 border border-white/5 text-slate-400 rounded-2xl px-4 py-3 text-xs rounded-tl-none animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-eco" />
              <span>Advisor is optimizing neural metrics...</span>
            </div>
          )}
        </div>

        {/* Typing container */}
        <form onSubmit={handleSendChat} className="p-4 bg-slate-900/40 border-t border-white/10 flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="e.g. How can I lower my food footprint without going 100% vegan?"
            className="flex-1 bg-[#0f172a]/80 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2ecc71]/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!chatMessage.trim() || sendingChat}
            className="p-3 bg-[#2ecc71] hover:brightness-110 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
