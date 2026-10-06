import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    new URL(
      "../app/admin/layout.tsx",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Admin layout tolerates tenant resolution failure",
  () => {
    assert.match(
      source,
      /let tenantResolution:[\s\S]*null/,
    );

    assert.match(
      source,
      /try \{[\s\S]*resolveAdminTenant\(\)[\s\S]*\} catch \{/,
    );

    assert.match(
      source,
      /tenantResolution\?\.tenant[\s\S]*null/,
    );
  },
);

test(
  "Admin shell can use tenant subscription metadata or recovery snapshot",
  () => {
    assert.match(
      source,
      /tenant\?\.entitlements/,
    );

    assert.match(
      source,
      /subscriptionStatus[\s\S]*tenant[\s\S]*subscriptionStatus/,
    );

    assert.match(
      source,
      /tenantRecoverySnapshot/,
    );

    assert.match(
      source,
      /snapshotUpdatedAt/,
    );
  },
);
