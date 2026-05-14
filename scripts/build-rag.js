#!/usr/bin/env node
// Usage: node scripts/build-rag.js <path-to-html-file>
// Parses the HTML, chunks the text, generates embeddings, saves to data/rag-index.json

const fs = require("fs");
const path = require("path");
const { HTMLParser } = require("node:module");

// Simple HTML text extractor
function extractText(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return text;
}

function chunkText(text, chunkSize = 800, overlap = 100) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.slice(i, end).trim());
    i += chunkSize - overlap;
  }
  return chunks.filter((c) => c.length > 50);
}

async function embed(text) {
  const res = await fetch("http://localhost:11434/api/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", input: text }),
  });
  const data = await res.json();
  return data.embeddings[0];
}

async function main() {
  const htmlPath = process.argv[2];
  if (!htmlPath) {
    console.error("Usage: node scripts/build-rag.js <path-to-html-file>");
    process.exit(1);
  }

  console.log("Reading file...");
  const html = fs.readFileSync(htmlPath, "utf-8");

  console.log("Extracting text...");
  const text = extractText(html);

  console.log("Chunking...");
  const chunks = chunkText(text);
  console.log(`${chunks.length} chunks created.`);

  const index = [];
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`\rEmbedding ${i + 1}/${chunks.length}...`);
    const embedding = await embed(chunks[i]);
    index.push({ text: chunks[i], embedding });
  }
  console.log("\nDone embedding.");

  const outPath = path.join(__dirname, "..", "data", "rag-index.json");
  fs.writeFileSync(outPath, JSON.stringify(index));
  console.log(`Index saved to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
