import { randomBytes, scryptSync } from "node:crypto";
// Read via stdin so the password never becomes a shell argument or history entry.
let password = "";
for await (const chunk of process.stdin) {
  password += chunk;
  if (Buffer.byteLength(password) > 1024) throw new Error("Password is too long.");
}
password = password.replace(/\r?\n$/, "");
if (password.length < 12) throw new Error("Use at least 12 characters.");
const salt = randomBytes(16).toString("hex");
process.stdout.write(`${salt}:${scryptSync(password, salt, 64).toString("hex")}\n`);
