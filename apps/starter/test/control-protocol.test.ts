import assert from "node:assert/strict";
import test from "node:test";

import {
  signControlRequest,
  verifyControlRequest,
} from "@staark/core/sign";

const SECRET =
  "test-control-secret";

function headers(
  values: Record<
    string,
    string
  >,
): Headers {
  return new Headers(
    values,
  );
}

test(
  "control v2 signature binds method path event sequence and body",
  () => {
    const body =
      JSON.stringify({
        status:
          "active",
      });

    const signed =
      signControlRequest({
        method: "POST",
        path:
          "/api/staark/subscription/sync",
        body,
        eventId:
          "subscription:sub_test:42",
        sequence: 42,
        secret:
          SECRET,
        now:
          1_800_000_000_000,
      });

    const result =
      verifyControlRequest({
        method: "POST",
        path:
          "/api/staark/subscription/sync",
        body,
        headers:
          headers(signed),
        secret:
          SECRET,
        now:
          1_800_000_000_000,
      });

    assert.equal(
      result.ok,
      true,
    );

    if (result.ok) {
      assert.equal(
        result.sequence,
        42n,
      );

      assert.equal(
        result.eventId,
        "subscription:sub_test:42",
      );
    }
  },
);

test(
  "signature cannot be replayed to another endpoint",
  () => {
    const body = "{}";

    const signed =
      signControlRequest({
        method: "POST",
        path:
          "/api/staark/provision",
        body,
        eventId:
          "provision:test",
        sequence: 1,
        secret:
          SECRET,
        now:
          1_800_000_000_000,
      });

    const result =
      verifyControlRequest({
        method: "POST",
        path:
          "/api/staark/subscription/sync",
        body,
        headers:
          headers(signed),
        secret:
          SECRET,
        now:
          1_800_000_000_000,
      });

    assert.deepEqual(
      result,
      {
        ok: false,
        reason:
          "signature",
      },
    );
  },
);

test(
  "body mutation invalidates control signature",
  () => {
    const signed =
      signControlRequest({
        method: "POST",
        path:
          "/api/staark/subscription/sync",
        body:
          '{"status":"active"}',
        eventId:
          "subscription:test:7",
        sequence: 7,
        secret:
          SECRET,
        now:
          1_800_000_000_000,
      });

    const result =
      verifyControlRequest({
        method: "POST",
        path:
          "/api/staark/subscription/sync",
        body:
          '{"status":"canceled"}',
        headers:
          headers(signed),
        secret:
          SECRET,
        now:
          1_800_000_000_000,
      });

    assert.equal(
      result.ok,
      false,
    );
  },
);

test(
  "expired control signature is rejected",
  () => {
    const signed =
      signControlRequest({
        method: "POST",
        path:
          "/api/staark/subscription/sync",
        body: "{}",
        eventId:
          "subscription:test:8",
        sequence: 8,
        secret:
          SECRET,
        now:
          1_800_000_000_000,
      });

    const result =
      verifyControlRequest({
        method: "POST",
        path:
          "/api/staark/subscription/sync",
        body: "{}",
        headers:
          headers(signed),
        secret:
          SECRET,
        now:
          1_800_000_301_000,
      });

    assert.deepEqual(
      result,
      {
        ok: false,
        reason:
          "expired",
      },
    );
  },
);
