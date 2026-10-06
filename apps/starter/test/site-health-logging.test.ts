import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    new URL(
      "../app/api/admin/health/route.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Site Health scan writes lifecycle logs",
  () => {
    assert.match(
      source,
      /action:\s*"scan\.started"/,
    );

    assert.match(
      source,
      /action:\s*"scan\.completed"/,
    );

    assert.match(
      source,
      /action:\s*"scan\.failed"/,
    );
  },
);

test(
  "Site Health completion log stores diagnostic summary",
  () => {
    assert.match(
      source,
      /errors:[\s\S]*report\.counts\.errors/,
    );

    assert.match(
      source,
      /warnings:[\s\S]*report\.counts\.warnings/,
    );

    assert.match(
      source,
      /passed:[\s\S]*report\.counts\.passed/,
    );

    assert.match(
      source,
      /checks:[\s\S]*report\.counts\.checks/,
    );

    assert.match(
      source,
      /durationMs/,
    );
  },
);
