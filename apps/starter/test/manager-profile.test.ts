import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    new URL(
      "../app/admin/profile/page.tsx",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Manager profile does not use the client account profile UI",
  () => {
    const managerBranch =
      source.indexOf(
        'role ===\n    "manager"',
      );

    const clientProfile =
      source.lastIndexOf(
        "<ProfileSecurity />",
      );

    assert.notEqual(
      managerBranch,
      -1,
    );

    assert.notEqual(
      clientProfile,
      -1,
    );

    assert.ok(
      managerBranch <
        clientProfile,
      "Manager must branch before rendering the DB-backed client profile.",
    );
  },
);

test(
  "Manager profile exposes recovery session state",
  () => {
    assert.match(
      source,
      /session\.recoveryMode/,
    );

    assert.match(
      source,
      /Centrally managed/,
    );

    assert.match(
      source,
      /database-independent Manager recovery access/,
    );
  },
);
