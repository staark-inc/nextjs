import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
const moduleUrl = new URL("../lib/editor-publication.ts", import.meta.url).href;
test("publication input follows Stockholm local time in summer and winter and preserves ISO storage", () => {
  const script = `import { publicationInputValue, publicationFromInput } from ${JSON.stringify(moduleUrl)};
    console.log(JSON.stringify([
      publicationFromInput("2026-10-06T22:23"),
      publicationInputValue("2026-10-06T20:23:00.000Z"),
      publicationFromInput("2026-12-06T22:23"),
      publicationInputValue("2026-12-06T21:23:00.000Z"),
      publicationFromInput(""), publicationInputValue(undefined)
    ]));`;
  const result = execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { env: { ...process.env, TZ: "Europe/Stockholm" }, encoding: "utf8" });
  assert.deepEqual(JSON.parse(result), ["2026-10-06T20:23:00.000Z", "2026-10-06T22:23", "2026-12-06T21:23:00.000Z", "2026-12-06T22:23", null, ""]);
});
