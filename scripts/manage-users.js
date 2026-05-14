#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

function load() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}

function save(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "add": {
      const [username, password, role] = args;
      if (!username || !password) {
        console.error("Usage: node scripts/manage-users.js add <username> <password> [role]");
        console.error("  role: admin | operator | user (default: user)");
        process.exit(1);
      }
      const validRoles = ["admin", "operator", "user"];
      const userRole = role && validRoles.includes(role) ? role : "user";
      const users = load();
      if (users.find((u) => u.username === username)) {
        console.error(`User "${username}" already exists. Use reset to change password.`);
        process.exit(1);
      }
      const hash = await bcrypt.hash(password, 10);
      users.push({
        id: crypto.randomUUID(),
        username,
        passwordHash: hash,
        role: userRole,
        approved: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginCount: 0,
        lastActive: null,
      });
      save(users);
      console.log(`✓ User "${username}" created with role "${userRole}".`);
      break;
    }

    case "promote": {
      const [username, role] = args;
      if (!username) {
        console.error("Usage: node scripts/manage-users.js promote <username> [role]");
        console.error("  role: admin | operator | user (default: admin)");
        process.exit(1);
      }
      const validRoles = ["admin", "operator", "user"];
      const targetRole = role && validRoles.includes(role) ? role : "admin";
      const users = load();
      const user = users.find((u) => u.username === username);
      if (!user) {
        console.error(`User "${username}" not found.`);
        process.exit(1);
      }
      user.role = targetRole;
      user.approved = true;
      save(users);
      console.log(`✓ User "${username}" promoted to "${targetRole}" and approved.`);
      break;
    }

    case "delete": {
      const [username] = args;
      if (!username) {
        console.error("Usage: node scripts/manage-users.js delete <username>");
        process.exit(1);
      }
      const users = load();
      const filtered = users.filter((u) => u.username !== username);
      if (filtered.length === users.length) {
        console.error(`User "${username}" not found.`);
        process.exit(1);
      }
      save(filtered);
      console.log(`✓ User "${username}" deleted.`);
      break;
    }

    case "list": {
      const users = load();
      if (users.length === 0) {
        console.log("No users.");
      } else {
        console.log("Users:");
        users.forEach((u) =>
          console.log(`  - ${u.username} [${u.role || "unknown"}] ${u.approved ? "" : "(pending)"}`)
        );
      }
      break;
    }

    case "reset": {
      const [username, password] = args;
      if (!username || !password) {
        console.error("Usage: node scripts/manage-users.js reset <username> <password>");
        process.exit(1);
      }
      const users = load();
      const user = users.find((u) => u.username === username);
      if (!user) {
        console.error(`User "${username}" not found.`);
        process.exit(1);
      }
      user.passwordHash = await bcrypt.hash(password, 10);
      save(users);
      console.log(`✓ Password reset for "${username}".`);
      break;
    }

    default:
      console.log("Commands:");
      console.log("  node scripts/manage-users.js add <username> <password> [role]");
      console.log("  node scripts/manage-users.js promote <username> [role]");
      console.log("  node scripts/manage-users.js delete <username>");
      console.log("  node scripts/manage-users.js list");
      console.log("  node scripts/manage-users.js reset <username> <password>");
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
