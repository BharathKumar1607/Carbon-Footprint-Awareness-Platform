import { Challenge } from "../types";
import { Award, CheckCircle, Circle, Flame, Sparkles } from "lucide-react";

interface ChallengeListProps {
  challenges: (Challenge & { completed?: boolean })[];
  onComplete: (challengeId: string) => Promise<void>;
  isCompleting: string | null;
}

export default function ChallengeList({ challenges, onComplete, isCompleting }: ChallengeListProps) {
  return (
    <div className="glass-card p-6 shadow-2xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2ecc71]/15 text-eco rounded-xl">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-md font-bold text-white tracking-tight">Active Sustainability Challenges</h3>
              <p className="text-slate-400 text-xs">Transform daily lifestyle choices into action and earn XP</p>
            </div>
          </div>
        </div>

        <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
          {challenges.length === 0 ? (
            <p className="text-slate-400 text-xs py-4 text-center">No challenges loaded. Stay green!</p>
          ) : (
            challenges.map((c) => (
              <div
                key={c.id}
                className={`flex items-start justify-between gap-4 p-3.5 rounded-xl border transition-all ${
                  c.completed
                    ? "bg-slate-900/20 border-emerald-500/20 opacity-60"
                    : "bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex gap-3">
                  <button
                    disabled={!!c.completed || isCompleting === c.id}
                    onClick={() => onComplete(c.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 disabled:text-emerald-400 transition-colors shrink-0 focus:outline-none"
                  >
                    {c.completed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 hover:scale-105 transition-transform" />
                    )}
                  </button>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-semibold ${c.completed ? "line-through text-slate-400" : "text-white"}`}>
                        {c.title}
                      </h4>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md ${
                          c.category === "Transport"
                            ? "bg-sky-500/10 text-sky-400"
                            : c.category === "Energy"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : c.category === "Food"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-purple-500/10 text-purple-400"
                        }`}
                      >
                        {c.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 text-pretty leading-normal">{c.description}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono font-bold text-yellow-400">+{c.points_reward} pts</span>
                  {!c.completed && (
                    <button
                      disabled={isCompleting === c.id}
                      onClick={() => onComplete(c.id)}
                      className="px-2.5 py-1 text-[10px] font-semibold font-sans uppercase rounded-md bg-emerald-500/10 text-emerald-400 active:scale-95 transition-all text-center border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 cursor-pointer"
                    >
                      {isCompleting === c.id ? "..." : "Done"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2.5 text-[11px] text-slate-400 font-sans">
        <Award className="w-4 h-4 text-emerald-400" />
        <span>Completing daily goals accelerates your level badges automatically!</span>
      </div>
    </div>
  );
}
