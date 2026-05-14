// Usage: node scripts/promote.mjs <username>
// Approves + promotes a user to admin with top_secret clearance

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
}

const username = process.argv[2];
if (!username) { console.error("Usage: node scripts/promote.mjs <username>"); process.exit(1); }

const usersPath = path.join(__dirname, "../data/users.json");
if (!fs.existsSync(usersPath)) { console.error("users.json not found"); process.exit(1); }

function decrypt(data) {
  const ENC_PREFIX = "ENC:";
  if (!data.startsWith(ENC_PREFIX)) return data;
  const [ivHex, tagHex, ciphertextHex] = data.slice(ENC_PREFIX.length).split(":");
  const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString("utf-8") + decipher.final("utf-8");
}

function encrypt(plaintext) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `ENC:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

const raw = fs.readFileSync(usersPath, "utf-8");
const users = JSON.parse(decrypt(raw));

const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
if (!user) { console.error(`User "${username}" not found`); process.exit(1); }

user.approved = true;
user.role = "admin";
user.clearance = "top_secret";

fs.writeFileSync(usersPath, encrypt(JSON.stringify(users, null, 2)));
console.log(`✓ ${user.username} → admin / top_secret / approved`);
