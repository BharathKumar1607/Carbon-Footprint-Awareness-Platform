import React, { useState } from "react";
import { Leaf, Car, Zap, Utensils, Compass } from "lucide-react";

interface FootprintFormProps {
  onSubmit: (data: { km: number; kwh: number; diet: string; lifestyle: number }) => Promise<void>;
  isSubmitting: boolean;
}

export default function FootprintForm({ onSubmit, isSubmitting }: FootprintFormProps) {
  const [km, setKm] = useState<number>(3000);
  const [kwh, setKwh] = useState<number>(350);
  const [diet, setDiet] = useState<string>("mixed");
  const [lifestyle, setLifestyle] = useState<number>(3); // scale 1-5

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ km, kwh, diet, lifestyle });
  };

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl">
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Log New Footprint Record</h3>
          <p className="text-slate-400 text-xs text-balance">Input your monthly consumption stats to analyze carbon loads and earn Green Points.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Distance Field */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-sky-400" />
              Monthly Travel (km)
            </span>
            <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
              {km} km/month
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="12000"
            step="100"
            value={km}
            onChange={(e) => setKm(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>0 km</span>
            <span>6K km (Avg)</span>
            <span>12K+ km</span>
          </div>
        </div>

        {/* Electricity Field */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-yellow-400" />
              Electricity Usage (kWh)
            </span>
            <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
              {kwh} kWh/month
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="1500"
            step="20"
            value={kwh}
            onChange={(e) => setKwh(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>0 kWh</span>
            <span>500 kWh (Avg)</span>
            <span>1500 kWh</span>
          </div>
        </div>

        {/* Diet Choice Radio Selection */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
            <Utensils className="w-4 h-4 text-emerald-400" />
            Dietary Profile
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: "veg", label: "Vegan / Veg", desc: "Low agricultural emissions", factor: "1.5T CO₂/yr" },
              { id: "mixed", label: "Mixed Diet", desc: "Balanced consumption", factor: "2.2T CO₂/yr" },
              { id: "meat", label: "Heavy Meat", desc: "High protein logistics", factor: "3.3T CO₂/yr" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDiet(option.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  diet === option.id
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 scale-[1.02]"
                    : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-slate-800/40"
                }`}
              >
                <div className="text-xs font-semibold">{option.label}</div>
                <div className="text-[9px] mt-0.5 opacity-80 leading-tight">{option.desc}</div>
                <div className="text-[10px] font-mono mt-1.5 opacity-60">{option.factor}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Lifestyle Plastic Rating */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-purple-400" />
              Lifestyle & Consumption Index
            </span>
            <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
              Tier {lifestyle} / 5
            </span>
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setLifestyle(level)}
                className={`flex-1 py-1 px-1 text-center rounded font-semibold text-xs transition-all ${
                  lifestyle >= level
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/15"
                    : "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-400"
                }`}
              >
                {level === 1 ? "Eco" : level === 3 ? "Mod" : level === 5 ? "Lux" : level}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 italic font-sans">
            *Includes factors such as single-use plastics, packaging materials, and fast fashion.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full text-slate-950 font-semibold bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-800 disabled:text-slate-500 py-3 rounded-xl transition-all font-sans cursor-pointer text-sm shadow-xl active:scale-[0.99] glow-btn"
        >
          {isSubmitting ? "Processing Carbon Math..." : "Calculate & Log Footprint (+25 XP)"}
        </button>
      </form>
    </div>
  );
}
