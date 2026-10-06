import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const layout =
  readFileSync(
    new URL(
      "../app/admin/layout.tsx",
      import.meta.url,
    ),
    "utf8",
  );

const shell =
  readFileSync(
    new URL(
      "../app/admin/AdminShell.tsx",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Manager recovery distinguishes missing tenant data from suspension",
  () => {
    assert.match(
      layout,
      /managerRecovery[\s\S]*session\.recoveryMode/,
    );

    assert.match(
      layout,
      /tenantDataUnavailable[\s\S]*tenant === null/,
    );

    assert.match(
      layout,
      /billingWarning: false/,
    );

    assert.match(
      layout,
      /suspended: false/,
    );
  },
);

test(
  "Admin shell renders a recovery degraded-state banner",
  () => {
    assert.match(
      shell,
      /tenantDataUnavailable/,
    );

    assert.match(
      shell,
      /Tenant data is temporarily unavailable/,
    );

    assert.match(
      shell,
      /Manager recovery access remains active/,
    );

    assert.match(
      shell,
      /!tenantDataUnavailable[\s\S]*billingWarning/,
    );
  },
);
