// Helper script to generate bcrypt password hashes
// Usage: node hash_password.js your-password-here

import bcrypt from "bcrypt";

const password = process.argv[2];

if (!password) {
  console.error("❌ Error: Please provide a password as an argument");
  console.log("Usage: node hash_password.js your-password-here");
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log("\n✅ Password hash generated successfully!\n");
console.log("Password:", password);
console.log("Hash:", hash);
console.log("\n📋 SQL INSERT statement:\n");
console.log(`INSERT INTO users (email, password_hash, role)
VALUES (
  'user@example.com',
  '${hash}',
  'user'
);\n`);
