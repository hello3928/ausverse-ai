import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSessionUser } from "@/lib/auth";
import { hashApiKey } from "@/lib/apikeys";
import { getUsers } from "@/lib/data";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const systemPromptPath = path.join(process.cwd(), "data", "system-prompt.txt");

function getAgentPrompt(): string {
  const base = `You are the AIA (Ausverse Intelligence Agency) field agent — a background intelligence system running on the operator's machine. You analyse visual intelligence: screenshots captured by the operator with a hotkey.

RESPONSE RULES:
- 2-4 sentences max. Be concise and direct.
- Use a classified-briefing tone — slightly dramatic but always useful.
- If the screenshot shows anything related to the Ausverse universe, its associates, or operations — respond with relevant intelligence from your briefing files below.
- For everything else, provide sharp, real-world factual analysis of what you see.
- If you see code, explain what it does. If you see a website, summarise it. If you see a game, identify it.
- Never say "I see a screenshot of..." — just jump straight into the analysis.`;

  // Try to load a condensed lore summary for context
  try {
    const full = fs.readFileSync(systemPromptPath, "utf-8").trim();
    const markerIdx = full.indexOf("=== KNOWN ASSOCIATES");
    if (markerIdx > 0) {
      // Include first ~4000 chars of lore for context
      const lore = full.slice(markerIdx, markerIdx + 4000);
      return base + "\n\n=== BRIEFING FILES (condensed) ===\n" + lore + "\n=== END BRIEFING ===";
    }
    return base;
  } catch {
    return base;
  }
}

export async function POST(req: NextRequest) {
  // Auth: session cookie or API key
  let user = await getSessionUser();

  if (!user) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer aia_")) {
      const key = authHeader.slice(7);
      const hash = hashApiKey(key);
      const users = getUsers();
      user = users.find((u) => u.apiKeyHash === hash) ?? null;
    }
  }

  if (!user || user.approved === false) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { image, messages } = await req.json();

  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  try {
    // Build the message list for Groq
    let groqMessages: Array<{ role: string; content: unknown }>;

    if (messages && Array.isArray(messages) && messages.length > 0) {
      // Multi-turn: pass the full conversation history
      groqMessages = [
        { role: "system", content: getAgentPrompt() },
        ...messages,
      ];
    } else {
      // Initial analysis: just the image
      groqMessages = [
        { role: "system", content: getAgentPrompt() },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: "Analyse this screenshot." },
          ],
        },
      ];
    }

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: groqMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Groq agent error:", err);
      return NextResponse.json({ text: "Analysis failed — AI engine unavailable." }, { status: 502 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "Unable to analyse.";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Agent analyse error:", err);
    return NextResponse.json({ text: "Analysis failed." }, { status: 500 });
  }
}
