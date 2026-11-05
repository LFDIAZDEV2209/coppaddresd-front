/** Misma regla de normalización que EmergencyContactPhone en el backend. */
export function normalizeEmergencyPhone(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw || raw.length > 30 || !/^\+?[0-9().\s-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  const phone = raw.startsWith("+") || (digits.startsWith("57") && digits.length === 12)
    ? `+${digits}` : `+57${digits}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return null;
  // Colombia y NANP (EE. UU./Canadá) usan diez dígitos nacionales.
  if (phone.startsWith("+57") && phone.length !== 13) return null;
  if (phone.startsWith("+1") && phone.length !== 12) return null;
  return phone;
}
