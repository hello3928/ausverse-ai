const SEARCH_TIMEOUT_MS = 8000;

export async function searchWeb(query: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return "Web search is not configured.";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ query, max_results: 5, include_answer: true }),
      signal: controller.signal,
    });

    if (!res.ok) return `Search failed (${res.status}).`;

    const data = await res.json();
    const parts: string[] = [];

    if (data.answer) parts.push(`Summary: ${data.answer}`);

    const results: { title: string; url: string; content: string }[] = data.results ?? [];
    parts.push(
      ...results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content ?? ""}`)
    );

    return parts.join("\n\n") || "No results found.";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "Search timed out.";
    return "Search failed.";
  } finally {
    clearTimeout(timeout);
  }
}
