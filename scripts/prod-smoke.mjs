import { spawnSync } from "node:child_process";

const checks = [
  ["Diff whitespace", "git", ["diff", "--check"]],
  ["Theme kit typecheck", "pnpm", ["--filter", "@staark/theme-kit", "typecheck"]],

  ["Skönhet typecheck", "pnpm", ["--filter", "@staark/theme-skonhet", "typecheck"]],
  ["Skönhet tests", "pnpm", ["--filter", "@staark/theme-skonhet", "test"]],

  ["El typecheck", "pnpm", ["--filter", "@staark/theme-el", "typecheck"]],
  ["El tests", "pnpm", ["--filter", "@staark/theme-el", "test"]],

  ["Kreatör typecheck", "pnpm", ["--filter", "@staark/theme-kreator", "typecheck"]],
  ["Kreatör tests", "pnpm", ["--filter", "@staark/theme-kreator", "test"]],

  ["Salong typecheck", "pnpm", ["--filter", "@staark/theme-salong", "typecheck"]],
  ["Salong tests", "pnpm", ["--filter", "@staark/theme-salong", "test"]],

  [
    "Gästfrihet typecheck",
    "pnpm",
    ["--filter", "@staark/theme-gastfrihet", "typecheck"],
  ],
  [
    "Gästfrihet tests",
    "pnpm",
    ["--filter", "@staark/theme-gastfrihet", "test"],
  ],

  ["Prisma schema", "pnpm", ["--filter", "@staark/starter", "db:validate"]],
  ["Starter typecheck", "pnpm", ["--filter", "@staark/starter", "typecheck"]],
  ["Starter tests", "pnpm", ["--filter", "@staark/starter", "test"]],
  ["Starter production build", "pnpm", ["--filter", "@staark/starter", "build"]],
];

function run(label, command, args) {
  console.log(`\n[prod-smoke] ${label}`);
  console.log(`[prod-smoke] ${command} ${args.join(" ")}`);

  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(`\n[prod-smoke] Could not start ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n[prod-smoke] FAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("[prod-smoke] Staark Next production smoke test");
console.log("[prod-smoke] This does not modify PostgreSQL or import fixture data.");

for (const [label, command, args] of checks) {
  run(label, command, args);
}

console.log("\n[prod-smoke] GREEN — all static, test and build checks passed.");
