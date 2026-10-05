import {
  createFormsRoute,
} from "@staark/platform/server";

import {
  content,
} from "@/lib/staark";

import {
  authorizePublicFormSubmission,
  authorizePublicFormToken,
} from "@/lib/public-form-access";

const FORM_KINDS =
  [
    "contact",
    "lead",
  ] as const;

// GET ?form=<id> issues a token only for a configured, currently-available
// contact/lead form. POST repeats authorization before persistence.
export const dynamic =
  "force-dynamic";

export const {
  GET,
  POST,
} = createFormsRoute(
  content,
  {
    acceptedKinds:
      FORM_KINDS,

    authorizeToken:
      (
        request,
        formId,
      ) =>
        authorizePublicFormToken(
          request,
          formId,
          FORM_KINDS,
        ),

    authorizeSubmission:
      (
        request,
        submission,
      ) =>
        authorizePublicFormSubmission(
          request,
          submission,
          FORM_KINDS,
        ),

  },
);
