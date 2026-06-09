import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { User, Footprint, Challenge, ChallengeCompletion } from "./src/types";

dotenv.config();

// Helper to secure password hashes with standard cryptographic SHA-256 and salt
const simpleHash = (str: string) => {
  return crypto.createHash("sha256").update(str + "_ecotrack_salt_2026").digest("hex");
};

// Default AI Model alias as specified in the SKILL guidelines
const GEMINI_MODEL = "gemini-3.5-flash";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database
const db = {
  users: [] as User[],
  passwords: {} as Record<string, string>, // userId -> simpleHash(password)
  footprints: [] as Footprint[],
  challengeCompletions: [] as ChallengeCompletion[],
  challenges: [
    { id: "c1", title: "Meatless Monday", description: "Skip meat for a whole day to reduce dietary emissions", points_reward: 50, category: "Food" },
    { id: "c2", title: "Pedal Power", description: "Cycle or walk for all trips under 5km today", points_reward: 100, category: "Transport" },
    { id: "c3", title: "Light's Out Advantage", description: "Unplug idle appliances and turn off unnecessary lights for 24h", points_reward: 60, category: "Energy" },
    { id: "c4", title: "Local Feast", description: "Purchase ingredients sourced within 100km for your dinner", points_reward: 70, category: "Food" },
    { id: "c5", title: "Cold Shower Boost", description: "Take a 5-minute cold shower to shield home energy use", points_reward: 80, category: "Energy" },
    { id: "c6", title: "Bus & Train Day", description: "Use public transit instead of driving your car", points_reward: 90, category: "Transport" },
    { id: "c7", title: "Refuse Extras", description: "Reject single-use plastic cups, cutlery, and bags", points_reward: 40, category: "Lifestyle" },
  ] as Challenge[],
};

// Seed demo user "green_hero"
const DEMO_USER: User = {
  id: "u_demo",
  username: "Green Hero",
  email: "hero@ecotrack.ai",
  points: 320,
  level: "Sustainability Explorer",
};
db.users.push(DEMO_USER);
db.passwords[DEMO_USER.id] = simpleHash("green");

// Seed footprints for demo user (last 7 entries)
const daysAgoDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const preseededFootprints: Footprint[] = [
  {
    id: "f1",
    userId: DEMO_USER.id,
    transport_co2: 1.12,
    energy_co2: 0.95,
    food_co2: 2.50,
    lifestyle_co2: 0.60,
    total_co2: 5.17,
    timestamp: daysAgoDate(14),
    inputs: { km: 6500, kwh: 2375, diet: "meat", lifestyle: 3 }
  },
  {
    id: "f2",
    userId: DEMO_USER.id,
    transport_co2: 0.95,
    energy_co2: 0.90,
    food_co2: 2.50,
    lifestyle_co2: 0.55,
    total_co2: 4.90,
    timestamp: daysAgoDate(12),
    inputs: { km: 5500, kwh: 2250, diet: "meat", lifestyle: 2.8 }
  },
  {
    id: "f3",
    userId: DEMO_USER.id,
    transport_co2: 0.70,
    energy_co2: 0.85,
    food_co2: 2.00,
    lifestyle_co2: 0.50,
    total_co2: 4.05,
    timestamp: daysAgoDate(10),
    inputs: { km: 4100, kwh: 2125, diet: "mixed", lifestyle: 2.5 }
  },
  {
    id: "f4",
    userId: DEMO_USER.id,
    transport_co2: 0.68,
    energy_co2: 0.82,
    food_co2: 2.00,
    lifestyle_co2: 0.45,
    total_co2: 3.95,
    timestamp: daysAgoDate(8),
    inputs: { km: 4000, kwh: 2050, diet: "mixed", lifestyle: 2.3 }
  },
  {
    id: "f5",
    userId: DEMO_USER.id,
    transport_co2: 0.50,
    energy_co2: 0.70,
    food_co2: 1.50,
    lifestyle_co2: 0.40,
    total_co2: 3.10,
    timestamp: daysAgoDate(5),
    inputs: { km: 2900, kwh: 1750, diet: "veg", lifestyle: 2.0 }
  },
  {
    id: "f6",
    userId: DEMO_USER.id,
    transport_co2: 0.35,
    energy_co2: 0.60,
    food_co2: 1.50,
    lifestyle_co2: 0.35,
    total_co2: 2.80,
    timestamp: daysAgoDate(2),
    inputs: { km: 2000, kwh: 1500, diet: "veg", lifestyle: 1.8 }
  }
];
db.footprints.push(...preseededFootprints);

// Seed completions for demo user
db.challengeCompletions.push({
  id: "comp1",
  userId: DEMO_USER.id,
  challengeId: "c1",
  completedAt: daysAgoDate(4),
});
db.challengeCompletions.push({
  id: "comp2",
  userId: DEMO_USER.id,
  challengeId: "c2",
  completedAt: daysAgoDate(3),
});

// Initialize Gemini Client
const isValidApiKey = (key: string | undefined): boolean => {
  if (!key) return false;
  const clean = key.trim();
  return (
    clean !== "" &&
    clean !== "MY_GEMINI_API_KEY" &&
    clean !== "YOUR_API_KEY" &&
    clean !== "MOCK_KEY" &&
    clean !== "undefined" &&
    !clean.startsWith("placeholder")
  );
};

let geminiClient: GoogleGenAI | null = null;
const initGemini = (): GoogleGenAI => {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
};

// --- AUTH ROUTE COMPATIBILITY ---
app.post("/api/auth/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const trimmedEmail = email.toLowerCase().trim();
  const existingUser = db.users.find(u => u.email === trimmedEmail);
  if (existingUser) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const userId = "u_" + Math.random().toString(36).substr(2, 9);
  const newUser: User = {
    id: userId,
    username: username.trim(),
    email: trimmedEmail,
    points: 0,
    level: "Green Beginner",
  };

  db.users.push(newUser);
  db.passwords[userId] = simpleHash(password);

  // preseed 2 items for visual consistency
  const now = new Date();
  db.footprints.push({
    id: "f_init",
    userId,
    transport_co2: 1.5,
    energy_co2: 1.0,
    food_co2: 2.5,
    lifestyle_co2: 0.5,
    total_co2: 5.5,
    timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000 * 3).toISOString(),
    inputs: { km: 8800, kwh: 2500, diet: "meat", lifestyle: 2.5 }
  });

  res.status(201).json(newUser);
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  const trimmedEmail = email.toLowerCase().trim();
  const user = db.users.find(u => u.email === trimmedEmail);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (db.passwords[user.id] !== simpleHash(password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json(user);
});

// Update a user's points (synchronized with local storage triggers or server-side actions)
app.patch("/api/users/:userId/points", (req, res) => {
  const { userId } = req.params;
  const { points } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (typeof points === "number") {
    user.points = points;
    // Calculate level
    if (user.points > 500) {
      user.level = "Eco Champion";
    } else if (user.points > 200) {
      user.level = "Sustainability Explorer";
    } else {
      user.level = "Green Beginner";
    }
  }

  res.json(user);
});

// --- FOOTPRINTS API ---
app.get("/api/footprints", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId parameter" });
  }

  const userFootprints = db.footprints
    .filter(f => f.userId === userId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  res.json(userFootprints);
});

app.post("/api/footprints", (req, res) => {
  const { userId, km, kwh, diet, lifestyle } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  // Validate user exists in memory
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User profile not found in session database" });
  }

  // Strictly validate bounds for travel (km)
  const parsedKm = Number(km);
  if (isNaN(parsedKm) || parsedKm < 0 || parsedKm > 100000) {
    return res.status(400).json({ error: "Travel distance must be a positive number between 0 and 100,000 km." });
  }

  // Strictly validate bounds for electricity (kwh)
  const parsedKwh = Number(kwh);
  if (isNaN(parsedKwh) || parsedKwh < 0 || parsedKwh > 50000) {
    return res.status(400).json({ error: "Electricity draw must be a positive number between 0 and 50,000 kWh." });
  }

  // Strictly validate bounds for diet parameter
  const validDiets = ["veg", "mixed", "meat"];
  const selectedDiet = validDiets.includes(diet) ? diet : "mixed";

  // Strictly validate lifestyle index
  const parsedLifestyle = Number(lifestyle);
  if (isNaN(parsedLifestyle) || parsedLifestyle < 1 || parsedLifestyle > 5) {
    return res.status(400).json({ error: "Lifestyle index must be an integer between 1 and 5." });
  }

  // Simple multipliers (Metric Tons CO2 per unit/year or adjusted monthly equivalent metric)
  // Let's standardise on metric tonnes CO2 per year based on monthly inputs (to make it exciting and intuitive)
  // Distance: avg emissions 0.00017 metric tons CO2 per km (car)
  const trans_co2 = Number(parsedKm * 0.00017);
  // Energy: avg emissions 0.0004 metric tons CO2 per kWh
  const energy_co2 = Number(parsedKwh * 0.0004);
  // Diet: standard factor
  const foodMap: Record<string, number> = { veg: 1.5, mixed: 2.2, meat: 3.3 };
  const food_co2 = foodMap[selectedDiet] || 2.2;
  // Lifestyle emissions mapping: 1 to 5 points (custom factor for sorting lifestyle items)
  const lifestyle_co2 = Number(parsedLifestyle * 0.2);

  const total_co2 = Number((trans_co2 + energy_co2 + food_co2 + lifestyle_co2).toFixed(2));

  const newEntry: Footprint = {
    id: "f_" + Math.random().toString(36).substr(2, 9),
    userId,
    transport_co2: parseFloat(trans_co2.toFixed(2)),
    energy_co2: parseFloat(energy_co2.toFixed(2)),
    food_co2: parseFloat(food_co2.toFixed(2)),
    lifestyle_co2: parseFloat(lifestyle_co2.toFixed(2)),
    total_co2,
    timestamp: new Date().toISOString(),
    inputs: { km: Number(km || 0), kwh: Number(kwh || 0), diet, lifestyle: Number(lifestyle || 2) },
  };

  db.footprints.push(newEntry);

  // Automatically check level logic & add a prompt rewards count
  if (user) {
    user.points += 25; // Gain 25 points for logging carbon footprints
    if (user.points > 500) user.level = "Eco Champion";
    else if (user.points > 200) user.level = "Sustainability Explorer";
  }

  res.status(201).json({ entry: newEntry, pointsGained: 25, user });
});

// --- CHALLENGES API ---
app.get("/api/challenges", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.json(db.challenges);
  }

  // Find completed challenges ids
  const completedIds = db.challengeCompletions
    .filter(c => c.userId === userId)
    .map(c => c.challengeId);

  const challengesWithStatus = db.challenges.map(ch => ({
    ...ch,
    completed: completedIds.includes(ch.id),
  }));

  res.json(challengesWithStatus);
});

app.post("/api/challenges/complete", (req, res) => {
  const { userId, challengeId } = req.body;
  if (!userId || !challengeId) {
    return res.status(400).json({ error: "Missing userId or challengeId" });
  }

  const challenge = db.challenges.find(c => c.id === challengeId);
  if (!challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  // Prevent double completion on server side if desired
  const alreadyCompleted = db.challengeCompletions.some(
    c => c.userId === userId && c.challengeId === challengeId
  );

  if (alreadyCompleted) {
    return res.status(400).json({ error: "Challenge already completed!" });
  }

  const completion: ChallengeCompletion = {
    id: "comp_" + Math.random().toString(36).substr(2, 9),
    userId,
    challengeId,
    completedAt: new Date().toISOString(),
  };

  db.challengeCompletions.push(completion);

  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.points += challenge.points_reward;
    if (user.points > 500) user.level = "Eco Champion";
    else if (user.points > 200) user.level = "Sustainability Explorer";
  }

  res.status(201).json({ user, completion });
});

// --- AI ADVISOR API (GEMINI WITH SOLID FALLBACK) ---
app.post("/api/ai/tips", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  // Fetch the latest footprint for personalized advice
  const latest = db.footprints
    .filter(f => f.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  // Primary rule-based fallbacks (highly stylized and friendly)
  const defaultTips = [
    {
      category: "Transport",
      text: "Switch to walking or cycling for distances under 5 kilometers. This eliminates short-trip high fuel consumption.",
      impact: "Saves up to 0.4 tons CO2/yr",
    },
    {
      category: "Energy",
      text: "Wash clothes at 30°C and hang-dry instead of machine tumble. Reduces household electrical draw significantly.",
      impact: "Saves up to 0.2 tons CO2/yr",
    },
    {
      category: "Food",
      text: "Incorporate two entire plant-based dinner days into your weekly schedule to scale down agricultural overhead.",
      impact: "Saves up to 0.5 tons CO2/yr",
    },
  ];

  if (latest) {
    // Generate tailored rules as fallbacks in case Gemini isn't accessible
    if (latest.transport_co2 > 1.2) {
      defaultTips[0] = {
        category: "Transport",
        text: `Your current transport emissions of ${latest.transport_co2} tons are premium! Try consolidating car travel or using public trains once weekly.`,
        impact: "Saves up to 1.1 tons CO2/yr",
      };
    }
    if (latest.energy_co2 > 1.0) {
      defaultTips[1] = {
        category: "Energy",
        text: `With energy emissions at ${latest.energy_co2} tons, consider auditing wall-plug standby loads or swapping to low-energy LED lightings.`,
        impact: "Saves up to 0.6 tons CO2/yr",
      };
    }
    if (latest.inputs?.diet === "meat") {
      defaultTips[2] = {
        category: "Food",
        text: "Your dietary footprint utilizes heavy protein agriculture inputs. Swapping meat for lentils or tofu 3 days a week heavily curtails emissions.",
        impact: "Saves up to 0.9 tons CO2/yr",
      };
    }
  }

  // Attempt real Gemini advice using the user's secret key
  const hasApiKey = isValidApiKey(process.env.GEMINI_API_KEY);

  if (!hasApiKey) {
    // Gracefully handle missing key with high-fidelity system default
    return res.json({
      tips: defaultTips,
      isAiGenerated: false,
      modelUsed: "Rule-Based Expert Engine",
    });
  }

  try {
    const ai = initGemini();
    const latestDetails = latest
      ? `Transport CO2: ${latest.transport_co2} tons, Energy CO2: ${latest.energy_co2} tons, Food CO2: ${latest.food_co2} tons, Lifestyle CO2: ${latest.lifestyle_co2} tons, Diet: ${latest.inputs?.diet}, Km Traveled: ${latest.inputs?.km}, kWh Used: ${latest.inputs?.kwh}`
      : "No carbon records completed yet. The user wishes to embark on a green path.";

    const prompt = `
You are the AI Sustainability Advisor in 'EcoTrack AI' (a stylish gamified carbon tracker).
We have carbon calculations available for the current user:
${latestDetails}

Generate exactly 3 extremely compelling, personalized, encouraging, and highly specific sustainability action recommendations for this user.
Focus the advice precisely on their highest categories or general improvements if no records exist.
Each tip must be direct and actionable, structured as a clean JSON response format.

Respond ONLY with a valid JSON array matching the exact structure:
[
  {
    "category": "Food" | "Transport" | "Energy" | "Lifestyle",
    "text": "The highly specific recommendation, up to 18 words",
    "impact": "Estimated carbon savings (e.g. 'Saves 0.45 tons CO2/yr')"
  },
  ...
]
`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const textOutput = response.text || "";
    const parsedTips = JSON.parse(textOutput.trim());

    if (Array.isArray(parsedTips) && parsedTips.length > 0) {
      return res.json({
        tips: parsedTips,
        isAiGenerated: true,
        modelUsed: GEMINI_MODEL,
      });
    }

    throw new Error("Invalid structure returned by model");
  } catch (error) {
    // Beautiful, robust error logging and fallback behavior
    console.error("Gemini Advisor Error, falling back to rule expert engine:", error);
    return res.json({
      tips: defaultTips,
      isAiGenerated: false,
      modelUsed: "Rule-Based Expert Engine (Fallback)",
    });
  }
});

// --- AI LIVE CHAT CONSULTATION ENDPOINT ---
app.post("/api/ai/chat", async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ error: "Missing userId or message" });
  }

  const latest = db.footprints
    .filter(f => f.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const latestContext = latest
    ? `The user's latest carbon footprint calculations: Total CO2: ${latest.total_co2} Tons/yr, Diet profile: ${latest.inputs?.diet}, Driving distance: ${latest.inputs?.km} km/mo, Home Electricity draw: ${latest.inputs?.kwh} kWh/mo.`
    : "The user hasn't calculated their carbon footprint yet.";

  const hasApiKey = isValidApiKey(process.env.GEMINI_API_KEY);

  if (!hasApiKey) {
    // Elegant expert fallback logic
    const msgLower = message.toLowerCase();
    let advice = "I am ready to help you optimize your carbon foot-loads! Since my Gemini cognitive model is operating in standard sandbox, here is an active rule tip: ";
    if (msgLower.includes("diet") || msgLower.includes("food") || msgLower.includes("eat")) {
      advice += "Our local data charts show that swapping standard meat dishes for grains and agricultural proteins reduces dietary nitrogen loads by up to 35%! Focus on high impact items like beef or dairy.";
    } else if (msgLower.includes("travel") || msgLower.includes("car") || msgLower.includes("km") || msgLower.includes("driving")) {
      advice += "Transport accounts for a high share of household footprints. Try setting up weekly carpools, using regional passenger links, or utilizing non-combustion options for short-range travel.";
    } else if (msgLower.includes("electricity") || msgLower.includes("kwh") || msgLower.includes("energy") || msgLower.includes("lights")) {
      advice += "To drop energy draw, enable smart thermo setups to shift draw cycles, use low energy LED systems, and unplug passive adapters which draw vampire current!";
    } else {
      advice += "The fastest route to sustainable life is looking for micro items: buy locally sourced produce, minimize active food waste, and look for daily challenges to establish healthy habits!";
    }

    return res.json({
      response: advice,
      isAiGenerated: false,
      modelUsed: "Rule-Based Expert Engine"
    });
  }

  try {
    const ai = initGemini();
    const systemInstruction = `
You are the AI Sustainability Advisor in 'EcoTrack AI'.
The user wants to reduce their carbon output.
Context: ${latestContext}
Respond to their message in an extremely encouraging, expert, concise, and professional style (maximum 80 words). Provide a highly actionable and structured tip. Keep equations simple if any.
`;

    const chatResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: message,
      config: {
        systemInstruction,
      },
    });

    res.json({
      response: chatResponse.text || "I am processing. Please take a small eco action in the meantime!",
      isAiGenerated: true,
      modelUsed: GEMINI_MODEL,
    });
  } catch (err) {
    console.error("AI Live Chat Error:", err);
    res.json({
      response: "EcoTrack is experiencing transient AI load capacity. Swap a regular light bulb to LED today to keep active!",
      isAiGenerated: false,
      modelUsed: "Rule-Based Fallback Model",
    });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EcoTrack AI fullstack environment loaded on port ${PORT}`);
  });
}

startServer();
