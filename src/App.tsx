import React, { useState, useEffect } from "react";
import { User, Footprint, Challenge } from "./types";
import FootprintForm from "./components/FootprintForm";
import DashboardCharts from "./components/DashboardCharts";
import AIAdvisor from "./components/AIAdvisor";
import ChallengeList from "./components/ChallengeList";
import {
  Leaf,
  LogOut,
  Sparkles,
  Award,
  Zap,
  Flame,
  Globe,
  TrendingDown,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle,
  TrendingUp,
  AlertCircle
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [challenges, setChallenges] = useState<(Challenge & { completed?: boolean })[]>([]);
  const [loadingApp, setLoadingApp] = useState(true);

  // Authentication Fields
  const [isRegistering, setIsRegistering] = useState(false);
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // App UI State
  const [isSubmittingFootprint, setIsSubmittingFootprint] = useState(false);
  const [isCompletingChallenge, setIsCompletingChallenge] = useState<string | null>(null);
  const [triggerAiRefresh, setTriggerAiRefresh] = useState(false);

  // Toast Alerts (Notification popup)
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "level" } | null>(null);

  // Trigger Toast Notification
  const triggerToast = (message: string, type: "success" | "info" | "level" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Try to load cached session on start
  useEffect(() => {
    const cachedUser = localStorage.getItem("ecotrack_user");
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        setCurrentUser(u);
      } catch (err) {
        console.error("Cache error", err);
      }
    }
    setLoadingApp(false);
  }, []);

  // Fetch Footprints and Challenges
  const loadUserData = async (user: User) => {
    try {
      // 1. Fetch Footprints
      const fRes = await fetch(`/api/footprints?userId=${user.id}`);
      if (fRes.ok) {
        const fData = await fRes.json();
        setFootprints(fData);
      }

      // 2. Fetch Challenges
      const cRes = await fetch(`/api/challenges?userId=${user.id}`);
      if (cRes.ok) {
        const cData = await cRes.json();
        setChallenges(cData);
      }
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadUserData(currentUser);
      localStorage.setItem("ecotrack_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("ecotrack_user");
    }
  }, [currentUser]);

  // Auth: Log In Demo account instantly for convenience
  const handleLogInDemo = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "hero@ecotrack.ai", password: "green" })
      });
      if (!res.ok) {
        throw new Error("Demo account offline. Please register details.");
      }
      const data = await res.json();
      setCurrentUser(data);
      triggerToast("Welcome back Eco Explorer! Preseeded metrics loaded.", "info");
    } catch (err: any) {
      setAuthError(err.message || "Failed to log in");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Standard registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword) {
      setAuthError("All fields are required");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }
      setCurrentUser(data);
      triggerToast(`Account created successfully! Welcome ${data.username}!🌻`);
    } catch (err: any) {
      setAuthError(err.message || "Failed to register");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAuthError("Email and Password are required");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid login credentials");
      }
      setCurrentUser(data);
      triggerToast(`Successfully signed in. Hello ${data.username}!`);
    } catch (err: any) {
      setAuthError(err.message || "Authentication error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setFootprints([]);
    setChallenges([]);
    triggerToast("Signed out safely. Stay green!", "info");
  };

  // Footprint: Log record
  const handleAddFootprint = async (formData: { km: number; kwh: number; diet: string; lifestyle: number }) => {
    if (!currentUser) return;
    setIsSubmittingFootprint(true);
    try {
      const res = await fetch("/api/footprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          ...formData
        })
      });
      if (!res.ok) throw new Error("Calculation failure");
      const data = await res.json();

      // Update footprint list
      setFootprints((prev) => [...prev, data.entry]);

      // Update user points and level reactive display
      const oldLevel = currentUser.level;
      if (data.user) {
        setCurrentUser(data.user);
        if (data.user.level !== oldLevel) {
          triggerToast(`🏆 LEVEL UP! You are now a: ${data.user.level}!`, "level");
        } else {
          triggerToast(`Logged successfully! Your total CO2: ${data.entry.total_co2} Tons. +25 green points earned!`);
        }
      }

      setTriggerAiRefresh((prev) => !prev);
    } catch (err) {
      console.error(err);
      triggerToast("Unable to submit metrics", "info");
    } finally {
      setIsSubmittingFootprint(false);
    }
  };

  // Challenge: Check off Goal
  const handleCompleteChallenge = async (challengeId: string) => {
    if (!currentUser) return;
    setIsCompletingChallenge(challengeId);

    try {
      const res = await fetch("/api/challenges/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          challengeId
        })
      });
      if (!res.ok) {
        const parsed = await res.json();
        throw new Error(parsed.error || "Completion failure");
      }

      const data = await res.json();

      // Trigger instant checkoff in state
      setChallenges((prev) =>
        prev.map((ch) => (ch.id === challengeId ? { ...ch, completed: true } : ch))
      );

      // Check for level status updates
      const oldLevel = currentUser.level;
      if (data.user) {
        setCurrentUser(data.user);
        if (data.user.level !== oldLevel) {
          triggerToast(`🏆 ACHIEVEMENT: ${oldLevel} upgraded to ${data.user.level}!`, "level");
        } else {
          triggerToast(`Goal Checked Off! Points awarded!`);
        }
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to catalog completion", "info");
    } finally {
      setIsCompletingChallenge(null);
    }
  };

  // Level status progress math help
  const getLevelProgress = () => {
    if (!currentUser) return 0;
    const pts = currentUser.points;
    if (pts >= 500) return 100; // Top level
    if (pts >= 200) {
      // Scale 200 to 500 (300 points span)
      return Math.round(((pts - 200) / 300) * 100);
    }
    // Scale 0 to 200 (200 points span)
    return Math.round((pts / 200) * 100);
  };

  const getNextLevelName = () => {
    if (!currentUser) return "";
    if (currentUser.points >= 500) return "Max Tier";
    if (currentUser.points >= 200) return "Eco Champion (500 pts)";
    return "Sustainability Explorer (200 pts)";
  };

  const getLatestCarbonCount = () => {
    if (footprints.length === 0) return 0;
    return footprints[footprints.length - 1].total_co2;
  };

  if (loadingApp) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center text-emerald-400 font-mono">
        <div className="flex flex-col items-center gap-2">
          <Leaf className="w-8 h-8 animate-spin" />
          <p className="text-xs">Powering EcoTrack AI console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] font-sans min-h-screen text-slate-100 selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden flex flex-col justify-between">
      {/* Decorative Elegant Dark blurred radial accents */}
      <div className="absolute top-24 left-1/4 w-80 h-80 bg-[#2ecc71]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Toast Achievements Container */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce max-w-sm">
          <div
            className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
              toast.type === "level"
                ? "bg-yellow-500/15 border-yellow-500 text-yellow-400 font-bold"
                : toast.type === "info"
                ? "bg-sky-500/15 border-sky-500 text-sky-400 font-medium"
                : "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold"
            }`}
          >
            {toast.type === "level" ? (
              <Award className="w-5 h-5 text-yellow-400 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <p className="text-xs">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Section aligned to Elegant Dark design */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0f172a]/80 border-b border-white/10 py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          {currentUser ? (
            <div className="space-y-1">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#2ecc71] flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-eco animate-pulse shrink-0" />
                  EcoTrack AI
                </span>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
                  Welcome back, {currentUser.username}
                </h1>
              </div>
              <div className="flex items-center space-x-3 text-xs md:text-sm pt-0.5">
                <span className="px-3 py-0.5 bg-[#2ecc71]/10 border border-[#2ecc71]/30 text-eco rounded-full font-semibold text-xs shrink-0">
                  {currentUser.level}
                </span>
                <span className="text-slate-400 font-mono">
                  {currentUser.points.toLocaleString()} Total Points
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#2ecc71]/10 text-eco rounded-lg">
                <Leaf className="w-6 h-6 text-eco" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">
                  EcoTrack AI
                </h1>
                <p className="text-[10px] text-slate-400">Real-time Carbon Intelligence & Sustainability Gamification</p>
              </div>
            </div>
          )}

          {currentUser && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const targetElement = document.getElementById("emission-insights");
                  if (targetElement) {
                    targetElement.scrollIntoView({ behavior: "smooth" });
                  } else {
                    triggerToast("Analytics details are listed below", "info");
                  }
                }}
                className="glass-card px-4 py-2.5 text-xs font-semibold hover:bg-white/10 transition-colors uppercase tracking-wider text-slate-300 pointer-events-auto cursor-pointer"
              >
                View Analytics
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetElement = document.getElementById("footprint-calculator");
                  if (targetElement) {
                    targetElement.scrollIntoView({ behavior: "smooth" });
                  } else {
                    triggerToast("Scroll down to footprint logger!", "info");
                  }
                }}
                className="eco-gradient text-slate-950 px-5 py-2.5 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                + Log Footprint
              </button>
              <button
                onClick={handleLogout}
                className="p-2.5 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-slate-300 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 relative">
        {!currentUser ? (
          /* Authentication Screen (Lock Panel) - styled with .glass-card */
          <div className="max-w-md mx-auto my-12 glass-card p-8 shadow-2xl relative">
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 p-3 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
              <Leaf className="w-8 h-8 text-eco glow-icon" />
            </div>

            <div className="text-center mt-4 mb-8">
              <h2 className="text-xl font-bold tracking-tight text-white font-sans">Empower Your Living: EcoTrack AI</h2>
              <p className="text-xs text-slate-400 mt-1.5 px-2">Calculate your personal carbon footprint, accomplish daily tasks and receive AI advisor audits powered by Gemini cognitive units.</p>
            </div>

            {authError && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {isRegistering ? (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">Username</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      className="w-full bg-[#0f172a]/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                      placeholder="e.g. EcoExplorer"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      className="w-full bg-[#0f172a]/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                      placeholder="e.g. hero@ecotrack.ai"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      className="w-full bg-[#0f172a]/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-2 text-slate-950 bg-[#2ecc71] hover:brightness-110 disabled:bg-slate-800 py-3 rounded-xl font-semibold text-sm transition-all focus:outline-none cursor-pointer font-sans"
                >
                  {authLoading ? "Creating Sandbox Profile..." : "Sign Up & Start Tracking"}
                </button>
              </form>
            ) : (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      className="w-full bg-[#0f172a]/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                      placeholder="hero@ecotrack.ai"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      className="w-full bg-[#0f172a]/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-2 text-slate-950 bg-[#2ecc71] hover:brightness-110 disabled:bg-slate-800 py-3 rounded-xl font-semibold text-sm transition-all focus:outline-none cursor-pointer font-sans"
                >
                  {authLoading ? "Accessing Workspace..." : "Sign In"}
                </button>
              </form>
            )}

            {/* Alternation Toggles */}
            <div className="mt-6 pt-6 border-t border-white/5 text-center space-y-4">
              <div className="text-xs text-slate-400 font-sans">
                {isRegistering ? "Previously registered? " : "New to EcoTrack? "}
                <button
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setAuthError("");
                  }}
                  className="text-[#2ecc71] hover:underline font-semibold cursor-pointer"
                >
                  {isRegistering ? "Sign In Instead" : "Create Account"}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative text-[10px] text-slate-500 font-mono uppercase tracking-wider"><span className="bg-[#0f172a] px-2.5">OR TEST INSTANTLY</span></div>
              </div>

              {/* Demo Account quick access */}
              <button
                type="button"
                onClick={handleLogInDemo}
                disabled={authLoading}
                className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-semibold tracking-wide transition-colors border border-indigo-500/20 flex items-center justify-center gap-1.5 cursor-pointer font-sans"
              >
                <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                Launch Demo Sandbox Profile
              </button>
            </div>
          </div>
        ) : (
          /* Logged In Dashboard console */
          <div className="space-y-8 animate-fade-in text-slate-100">
            {/* Gamified Level Progress Bar Header using glass-card style */}
            <div className="glass-card p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Welcome back, {currentUser.username}! 🌱</span>
                  <span className="text-[10px] bg-[#2ecc71]/10 text-eco font-bold font-mono border border-eco/30 px-2.5 py-0.5 rounded-full">
                    {currentUser.level}
                  </span>
                </h2>
                <p className="text-slate-400 text-xs font-sans">
                  Your carbon tracking metrics have generated key offsets. Accomplish daily challenges to collect active badges!
                </p>
              </div>

              {/* Progress Gauges */}
              <div className="flex-1 max-w-md w-full space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">XP Progress to Next Badge</span>
                  <span className="text-eco font-bold">{currentUser.points} / {currentUser.points > 200 ? "500" : "200"} PTS</span>
                </div>
                {/* Level Progress Bar wrapper */}
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-[#2ecc71] to-[#27ae60] rounded-full transition-all duration-1000"
                    style={{ width: `${getLevelProgress()}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Current: {currentUser.level}</span>
                  <span>Next: {getNextLevelName()}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Cards Banner - Glass cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-5 flex flex-col justify-between h-36">
                <span className="text-slate-400 text-sm font-medium">Total Emissions</span>
                <div className="flex items-end space-x-2">
                  <span className="text-4xl font-bold">{getLatestCarbonCount()}</span>
                  <span className="text-slate-400 text-lg mb-1">tons</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-eco transition-all duration-700"
                    style={{ width: `${getLatestCarbonCount() > 0 ? Math.min(100, (getLatestCarbonCount() / 12) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between h-36">
                <span className="text-slate-400 text-sm font-medium font-sans">Monthly Trend</span>
                <div className="flex items-center space-x-2">
                  <span className="text-4xl font-bold">
                    {footprints.length > 1
                      ? `${footprints[footprints.length - 1].total_co2 > footprints[footprints.length - 2].total_co2 ? "+" : ""}${Math.round(
                          ((footprints[footprints.length - 1].total_co2 - footprints[footprints.length - 2].total_co2) /
                            (footprints[footprints.length - 2].total_co2 || 1)) *
                            100
                        )}%`
                      : "-12%"}
                  </span>
                  <TrendingDown className="w-6 h-6 text-eco" />
                </div>
                <span className="text-xs text-eco/80">Better than regional avg</span>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between h-36">
                <span className="text-slate-400 text-sm font-medium">Global Rank</span>
                <div className="flex items-end space-x-2">
                  <span className="text-3xl font-bold tracking-tight">Top {currentUser.points > 200 ? "15%" : "35%"}</span>
                </div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`h-1 w-full rounded-full ${
                        (currentUser.points > 200 ? 4 : 2) >= idx ? "bg-eco" : "bg-slate-800"
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between h-36">
                <span className="text-slate-400 text-sm font-medium">Sustainability Points</span>
                <div className="flex items-end space-x-2">
                  <span className="text-4xl font-sans font-bold text-yellow-400">{currentUser.points}</span>
                  <span className="text-slate-400 text-sm mb-1 font-mono">PTS</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  +{(challenges.filter((c) => c.completed).length) * 50} earned via goals
                </div>
              </div>
            </div>

            {/* Middle: Entry Form and Analytical Graphs */}
            <div id="emission-insights" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Formula calculations form */}
              <div id="footprint-calculator" className="xl:col-span-1">
                <FootprintForm onSubmit={handleAddFootprint} isSubmitting={isSubmittingFootprint} />
              </div>

              {/* Graphical widgets */}
              <div className="xl:col-span-2">
                <DashboardCharts footprints={footprints} />
              </div>
            </div>

            {/* Bottom Section: AI Advisor Audits and Daily Challenges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Intelligent AI Audit widget */}
              <AIAdvisor userId={currentUser.id} triggerRefresh={triggerAiRefresh} />

              {/* Sustainability gamified list */}
              <ChallengeList
                challenges={challenges}
                onComplete={handleCompleteChallenge}
                isCompleting={isCompletingChallenge}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer credits and information */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-[10px] text-slate-500 font-mono mt-12 bg-[#0f172a]/60 w-full shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 EcoTrack AI Inc. Powered by Gemini Cognitive Engine. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 cursor-help">Algorithm: Standard CO₂ Multipliers</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-help">Region: Global Averaging Models</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
