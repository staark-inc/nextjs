import { cp, readdir, chown, lstat } from "node:fs/promises";
import path from "node:path";
// One-shot Docker initializer. Never overwrite an existing editor project.
for (const [source, target] of [["/data/project", "/seed/studio"], ["/opt/custom-projects/forma-demo", "/seed/forma"]]) {
  const entries = await readdir(target);
  if (entries.length === 0) {
    await cp(source, target, { recursive: true, force: false, errorOnExist: true });
    async function owner(directory) {
      await chown(directory, 1001, 1001);
      for (const entry of await readdir(directory)) {
        const item = path.join(directory, entry);
        const stat = await lstat(item);
        if (stat.isSymbolicLink()) throw new Error("Seed projects must not contain symlinks.");
        if (stat.isDirectory()) await owner(item); else await chown(item, 1001, 1001);
      }
    }
    await owner(target);
    console.log(`Initialized ${target}.`);
  } else {
    if (!entries.includes("staark.custom.json")) throw new Error(`Incomplete project in ${target}; inspect the volume before retrying.`);
    console.log(`Keeping existing ${target}.`);
  }
}
