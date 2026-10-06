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
      /let tenant:[\s\S]*null = null/,
    );

    assert.match(
      source,
      /try \{[\s\S]*resolveAdminTenantContext\(\)[\s\S]*\} catch \{/,
    );
  },
);

test(
  "Admin shell can continue without tenant subscription metadata",
  () => {
    assert.match(
      source,
      /tenant\?\.entitlements/,
    );

    assert.match(
      source,
      /tenant\?\.subscriptionStatus/,
    );
  },
);
