import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getArchive, updateUser, getUsers } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { searchRAG } from "@/lib/rag";
import { searchWeb } from "@/lib/search";
import { hashApiKey } from "@/lib/apikeys";

const systemPromptPath = path.join(process.cwd(), "data", "system-prompt.txt");

const CORE_INSTRUCTIONS_END_MARKER = "=== KNOWN ASSOCIATES";

function getBaseInstructions(): string {
  try {
    const full = fs.readFileSync(systemPromptPath, "utf-8").trim();
    // Extract only the behavioral instructions before the lore data
    const markerIdx = full.indexOf(CORE_INSTRUCTIONS_END_MARKER);
    if (markerIdx > 0) {
      return full.slice(0, markerIdx).trim();
    }
    // If no marker found and file is huge, just use the first 2000 chars
    if (full.length > 5000) {
      return full.slice(0, 2000).trim();
    }
    return full;
  } catch {
    return "You are an Ausverse AI assistant.";
  }
}

function getArchiveIndex(): string {
  const archive = getArchive();
  if (archive.length === 0) return "";

  const archiveIndex = archive.map((item) =>
    `ARCHIVE ITEM [${item.id}]: ${item.title}\nTYPE: ${item.type}\nTAGS: ${item.tags.join(", ")}\nDESCRIPTION: ${item.description.slice(0, 200)}`
  ).join("\n\n");

  return `\n\n=== ARCHIVE INDEX ===
IMPORTANT ARCHIVE RULES:
- You MUST embed archive items using [ARCHIVE:uuid] whenever a user asks to see, show, find, or display a file, photo, video, or any item from the archive.
- You MUST also embed any archive item that is directly relevant to your answer, even if not explicitly asked.
- Use the EXACT syntax: [ARCHIVE:id] — replace "id" with the UUID from the index below.
- You can embed multiple items in one response. Place the embed on its own line.
- NEVER describe an archive item without embedding it. Always embed first, describe after.

${archiveIndex}

=== END ARCHIVE INDEX ===`;
}

function getLoreChunks(query: string): string {
  try {
    const full = fs.readFileSync(systemPromptPath, "utf-8").trim();
    const markerIdx = full.indexOf(CORE_INSTRUCTIONS_END_MARKER);
    if (markerIdx < 0) return "";
    const loreSection = full.slice(markerIdx);

    // Split lore into subject blocks
    const blocks = loreSection.split(/(?=^SUBJECT:|^===)/m).filter(b => b.trim().length > 50);
    if (blocks.length === 0) return "";

    // Score each block against the query keywords
    const keywords = query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (keywords.length === 0) return ""; // General query, no lore needed

    const MAX_CHARS = 12000;

    // For large blocks, extract only the lines that contain keywords
    function extractRelevantLines(block: string, budget: number): string {
      const lines = block.split("\n");
      // Always include the header (first 3 lines or up to first blank line)
      const headerEnd = Math.min(3, lines.findIndex((l, i) => i > 0 && l.trim() === ""));
      const header = lines.slice(0, headerEnd > 0 ? headerEnd : 3).join("\n");

      // Score remaining lines by keyword hits
      const scoredLines = lines.slice(headerEnd > 0 ? headerEnd : 3).map(line => {
        const lower = line.toLowerCase();
        const hits = keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
        return { line, hits };
      });

      // Take all lines with hits, plus one line of context before/after each
      const hitIndices = new Set<number>();
      scoredLines.forEach((sl, i) => {
        if (sl.hits > 0) {
          if (i > 0) hitIndices.add(i - 1);
          hitIndices.add(i);
          if (i < scoredLines.length - 1) hitIndices.add(i + 1);
        }
      });

      const relevant = Array.from(hitIndices).sort((a, b) => a - b).map(i => scoredLines[i].line);
      let result = header + "\n" + relevant.join("\n");
      if (result.length > budget) result = result.slice(0, budget);
      return result;
    }

    const scored = blocks.map(block => {
      const lower = block.toLowerCase();
      const score = keywords.reduce((s, kw) => s + (lower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 0);
      return { block, score };
    }).filter(b => b.score > 0);

    scored.sort((a, b) => b.score - a.score);

    let result = "";
    for (const { block } of scored.slice(0, 8)) {
      const remaining = MAX_CHARS - result.length;
      if (remaining <= 200) break;

      if (block.length <= remaining) {
        // Block fits entirely
        result += block + "\n\n";
      } else {
        // Block too large — extract only keyword-relevant lines
        result += extractRelevantLines(block, remaining) + "\n\n";
      }
    }
    return result ? `\n\n=== RELEVANT INTELLIGENCE ===\n${result.trim()}\n=== END INTELLIGENCE ===` : "";
  } catch {
    return "";
  }
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the internet for current information — YouTube channels, social media profiles, websites, news, people, links, or anything that may not be in the briefing files.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query to look up" },
        },
        required: ["query"],
      },
    },
  },
];

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const SEARCH_MARKER = "[[SEARCHING]]";
const MAX_TOOL_ROUNDS = 5;

function groqHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeToolCall(toolCall: any): Promise<string> {
  if (toolCall.function.name === "search_web") {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      return await searchWeb(args.query);
    } catch {
      return "Search failed.";
    }
  }
  return "Unknown tool.";
}

export async function POST(req: NextRequest) {
  const { messages, webSearch } = await req.json();
  const enableWebSearch = webSearch !== false;

  let userRecord = await getSessionUser();

  if (!userRecord) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer aia_")) {
      const key = authHeader.slice(7);
      const hash = hashApiKey(key);
      const users = getUsers();
      userRecord = users.find((u) => u.apiKeyHash === hash) ?? null;
    }
  }

  if (!userRecord || userRecord.approved === false) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const username = userRecord.username;

  const lastContent = messages[messages.length - 1]?.content;
  const userQuery = typeof lastContent === "string"
    ? lastContent
    : Array.isArray(lastContent)
      ? lastContent.filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join(" ")
      : "";

  const ragChunks = await searchRAG(userQuery, 5).catch(() => []);
  const trimmedChunks = ragChunks.map((c: string) => c.slice(0, 400));

  // Build system prompt: base instructions + relevant lore only (not the full 104KB)
  const baseInstructions = getBaseInstructions();
  const archiveIndex = getArchiveIndex();
  const loreContext = getLoreChunks(userQuery);
  const ragContext = trimmedChunks.length > 0
    ? `\n\n=== ADDITIONAL INTELLIGENCE FILES ===\n${trimmedChunks.join("\n---\n")}\n=== END INTELLIGENCE FILES ===`
    : "";

  // Add priority instruction when lore context is available
  const contextPriority = loreContext
    ? "\n\nIMPORTANT: Intelligence context has been provided below. ALWAYS answer from the provided intelligence files FIRST. Only use web search if the user explicitly asks for live/current web information or if the intelligence files have no relevant data."
    : "";

  const fullPrompt = baseInstructions + contextPriority + archiveIndex + loreContext + ragContext;

  const conversationMessages = [{ role: "system", content: fullPrompt }, ...messages];

  function logActivity() {
    try {
      if (username) updateUser(username, { lastActive: new Date().toISOString() });
    } catch {}
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (s: string) => controller.enqueue(new TextEncoder().encode(s));
      let currentMessages = [...conversationMessages];
      let searchSent = false;

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: groqHeaders(),
          body: JSON.stringify({
            model: MODEL,
            messages: currentMessages,
            ...(enableWebSearch ? { tools: TOOLS, tool_choice: "auto" } : {}),
            max_tokens: 2048,
          }),
        });

        if (!res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errJson: any = await res.json().catch(() => null);
          const failedGen = errJson?.error?.failed_generation as string | undefined;
          if (failedGen) {
            encode(failedGen);
            controller.close();
            logActivity();
            return;
          }
          console.error("Groq call failed:", res.status, JSON.stringify(errJson));
          encode("[System offline]");
          controller.close();
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await res.json();
        const choice = data.choices?.[0];

        if (choice?.finish_reason === "tool_calls" && choice.message?.tool_calls?.length > 0) {
          if (!searchSent) {
            encode(SEARCH_MARKER);
            searchSent = true;
          }

          currentMessages.push(choice.message);

          for (const toolCall of choice.message.tool_calls) {
            const result = await executeToolCall(toolCall);
            currentMessages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
          }
          continue;
        }

        if (choice?.message?.content) {
          encode(choice.message.content);
          controller.close();
          logActivity();
          return;
        }

        break;
      }

      // Fell through the loop — stream a final response without tools
      const groqRes = await fetch(GROQ_URL, {
        method: "POST",
        headers: groqHeaders(),
        body: JSON.stringify({ model: MODEL, messages: currentMessages, stream: true, max_tokens: 4096 }),
      });

      if (!groqRes.ok || !groqRes.body) {
        const errText = await groqRes.text().catch(() => "unknown");
        console.error("Final Groq call failed:", groqRes.status, errText);
        encode("[System offline]");
        controller.close();
        return;
      }

      const reader = groqRes.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") {
            controller.close();
            logActivity();
            return;
          }
          try {
            const json = JSON.parse(d);
            const token = json.choices?.[0]?.delta?.content ?? "";
            if (token) encode(token);
          } catch {}
        }
      }
      controller.close();
    },
  });

  return new NextResponse(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
