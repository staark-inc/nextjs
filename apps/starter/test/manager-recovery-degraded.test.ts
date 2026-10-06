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
  "Manager recovery distinguishes missing tenant data from snapshot recovery",
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
      /tenantRecoverySnapshot[\s\S]*resolvedBy[\s\S]*"snapshot"/,
    );

    assert.match(
      layout,
      /billingWarning:[\s\S]*false/,
    );

    assert.match(
      layout,
      /suspended:[\s\S]*false/,
    );
  },
);

test(
  "Admin shell renders recovery banners and suppresses billing alerts",
  () => {
    assert.match(
      shell,
      /tenantRecoverySnapshot/,
    );

    assert.match(
      shell,
      /Recovery snapshot active/,
    );

    assert.match(
      shell,
      /REC-02/,
    );

    assert.match(
      shell,
      /Tenant data is temporarily unavailable/,
    );

    assert.match(
      shell,
      /!tenantRecoverySnapshot[\s\S]*billingWarning/,
    );
  },
);
