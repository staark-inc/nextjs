import { blockFieldsForTheme } from "@/lib/block-fields";

/**
 * Lightweight block-form capability check.
 *
 * Keep this outside BlockFieldForm.tsx so importing the check
 * does not eagerly load the interactive editor + MediaPicker.
 */
export function hasFieldForm(
  type: string,
  themeId?: string,
): boolean {
  return Boolean(
    blockFieldsForTheme(themeId, type),
  );
}
