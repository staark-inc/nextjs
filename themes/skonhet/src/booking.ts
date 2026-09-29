/**
 * Maps the booking form's values onto the whitelisted S-Hub form fields.
 * booking_* fields make the Inbox treat the request as a booking (status
 * pending → confirmed/declined), which is what a salon wants.
 */

export type BookingInput = {
  service: string;
  stylist?: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
};

export const NO_PREFERENCE = "Ingen preferens";

export function buildBookingFields(input: BookingInput): Record<string, string> {
  const fields: Record<string, string> = {
    name: input.name.trim(),
    email: input.email.trim(),
    subject: `Bokningsförfrågan: ${input.service}`,
    booking_type: input.service,
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.date)) fields.booking_date = input.date;
  if (/^\d{2}:\d{2}$/.test(input.time)) fields.booking_time = input.time;
  const stylist = input.stylist?.trim();
  if (stylist && stylist !== NO_PREFERENCE) fields.booking_item = stylist;
  if (input.phone?.trim()) fields.phone = input.phone.trim();
  if (input.message?.trim()) fields.message = input.message.trim();
  return fields;
}

/** Today in the visitor's local time as YYYY-MM-DD (for the date input's min). */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
