/**
 * Workshop booking helpers, kept pure so they can be tested.
 * The request is mapped onto the whitelisted S-Hub form fields:
 * booking_item = registration number, booking_type = services (≤ 80 chars),
 * booking_date / booking_time = drop-off, message = the full details.
 */

/** Swedish plates: ABC 123 or ABC 12A. Returns "ABC 123" or null. */
export function normalizePlate(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z]{3}\d{2}[A-Z0-9]$/.test(compact) ? `${compact.slice(0, 3)} ${compact.slice(3)}` : null;
}

export type ServiceBookingInput = {
  plate: string;
  car?: string;
  mileage?: string;
  services: string[];
  date: string;
  dropOff: string;
  loanCar: boolean;
  name: string;
  email: string;
  phone?: string;
  message?: string;
};

export function buildServiceBooking(input: ServiceBookingInput): Record<string, string> {
  const plate = normalizePlate(input.plate) ?? input.plate.trim().toUpperCase();
  const services = input.services.map((s) => s.trim()).filter(Boolean);
  const joined = services.join(", ");
  const bookingType = joined.length <= 80 ? joined : `${joined.slice(0, 77)}…`;

  const car = [plate, input.car?.trim(), input.mileage?.trim() ? `${input.mileage.trim()} mil` : ""].filter(Boolean).join(" · ");
  const lines = [`Bil: ${car}`, `Tjänster: ${joined || "–"}`, `Lånebil: ${input.loanCar ? "Ja" : "Nej"}`];
  const note = input.message?.trim();

  const fields: Record<string, string> = {
    name: input.name.trim(),
    email: input.email.trim(),
    subject: `Verkstadsbokning: ${plate}`,
    booking_item: plate,
    booking_type: bookingType || "Verkstad",
    message: note ? `${lines.join("\n")}\n\n${note}` : lines.join("\n"),
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.date)) fields.booking_date = input.date;
  if (/^\d{2}:\d{2}$/.test(input.dropOff)) fields.booking_time = input.dropOff;
  if (input.phone?.trim()) fields.phone = input.phone.trim();
  return fields;
}

export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
