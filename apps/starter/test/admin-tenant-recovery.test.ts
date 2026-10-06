import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const tenantSource =
  readFileSync(
    new URL(
      "../lib/admin-tenant.ts",
      import.meta.url,
    ),
    "utf8",
  );

const snapshotSource =
  readFileSync(
    new URL(
      "../lib/admin-tenant-snapshot.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "healthy tenant resolution refreshes the recovery snapshot",
  () => {
    assert.match(
      tenantSource,
      /resolveTenantContext/,
    );

    assert.match(
      tenantSource,
      /rememberAdminTenantSnapshot/,
    );
  },
);

test(
  "tenant resolution falls back to persistent snapshot",
  () => {
    assert.match(
      tenantSource,
      /readAdminTenantSnapshot/,
    );

    assert.match(
      tenantSource,
      /resolvedBy:[\s\S]*"snapshot"/,
    );
  },
);

test(
  "site id and site key use the central recovery-capable resolver",
  () => {
    assert.match(
      tenantSource,
      /requireAdminTenantContext/,
    );

    assert.match(
      tenantSource,
      /\.siteId/,
    );

    assert.match(
      tenantSource,
      /\.siteKey/,
    );
  },
);

test(
  "tenant snapshot is persisted outside tenant database",
  () => {
    assert.match(
      snapshotSource,
      /\.staark\/recovery\/tenant-contexts\.json/,
    );

    assert.match(
      snapshotSource,
      /getStorage/,
    );
  },
);
