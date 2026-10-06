import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    new URL(
      "../proxy.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "recovery Manager skips tenant database resolution in proxy",
  () => {
    assert.match(
      source,
      /const managerRecovery[\s\S]*session\.recoveryMode/,
    );

    assert.match(
      source,
      /contentConfig\.source ===[\s\S]*"postgres"[\s\S]*&&[\s\S]*!managerRecovery[\s\S]*resolveTenantContext/,
    );
  },
);

test(
  "recovery Manager skips DB-backed site settings preflight",
  () => {
    assert.match(
      source,
      /!setupRequest[\s\S]*&&[\s\S]*!managerRecovery[\s\S]*readAdminSiteSettings/,
    );
  },
);

test(
  "proxy uses standalone session secret resolver",
  () => {
    assert.match(
      source,
      /resolveAdminSessionSecret/,
    );

    assert.doesNotMatch(
      source,
      /resolveAdminAuthConfig\(\)\.sessionSecret/,
    );
  },
);
