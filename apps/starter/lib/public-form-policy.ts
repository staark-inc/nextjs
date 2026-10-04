import type {
  SubmissionKind,
} from "@staark/core";

import type {
  TenantEntitlements,
} from "./tenant-context";

export type PublicFormPolicyCode =
  | "SITE_UNAVAILABLE"
  | "FORM_NOT_FOUND"
  | "FORM_FEATURE_REQUIRED";

export type PublicFormPolicyResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: PublicFormPolicyCode;
    };

export type PublicFormPolicyInput = {
  publicAccess: boolean;
  entitlements: TenantEntitlements;

  /**
   * Kinds actually configured on the site's current non-deleted pages for this
   * exact formId.
   */
  registeredKinds: readonly SubmissionKind[];

  /**
   * Kinds this endpoint is allowed to serve.
   */
  endpointKinds: readonly SubmissionKind[];

  /**
   * Undefined while issuing the token. Defined for POST intake.
   */
  requestedKind?: SubmissionKind;
};

function featureAllowed(
  kind: SubmissionKind,
  entitlements: TenantEntitlements,
): boolean {
  if (kind === "contact") {
    // Basic contact intake is part of the website itself.
    return true;
  }

  if (kind === "lead") {
    return (
      entitlements.leadsEnabled ===
      true
    );
  }

  return (
    entitlements.bookingEnabled ===
    true
  );
}

export function evaluatePublicFormPolicy(
  input: PublicFormPolicyInput,
): PublicFormPolicyResult {
  if (!input.publicAccess) {
    return {
      ok: false,
      code: "SITE_UNAVAILABLE",
    };
  }

  const configured =
    input.registeredKinds.filter(
      (kind) =>
        input.endpointKinds.includes(
          kind,
        ),
    );

  if (!configured.length) {
    return {
      ok: false,
      code: "FORM_NOT_FOUND",
    };
  }

  if (input.requestedKind) {
    if (
      !input.endpointKinds.includes(
        input.requestedKind,
      ) ||
      !input.registeredKinds.includes(
        input.requestedKind,
      )
    ) {
      return {
        ok: false,
        code: "FORM_NOT_FOUND",
      };
    }

    return featureAllowed(
      input.requestedKind,
      input.entitlements,
    )
      ? {
          ok: true,
        }
      : {
          ok: false,
          code:
            "FORM_FEATURE_REQUIRED",
        };
  }

  /*
   * Token issuance is allowed only when this exact configured form has at
   * least one kind that is both valid for this endpoint and enabled by plan.
   */
  return configured.some((kind) =>
    featureAllowed(
      kind,
      input.entitlements,
    ),
  )
    ? {
        ok: true,
      }
    : {
        ok: false,
        code:
          "FORM_FEATURE_REQUIRED",
      };
}
