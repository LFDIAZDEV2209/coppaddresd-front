import type { CountryOption } from "@/features/patients/types";

/**
 * Compone un número internacional en formato E.164 a partir del código de
 * país seleccionado y la parte nacional. Si el usuario ya escribió un número
 * con "+", se respeta tal cual (solo se limpian separadores).
 */
export function composeE164(phoneCode: string | null | undefined, national: string): string {
  const raw = (national ?? "").trim();
  if (!raw) return "";

  if (raw.startsWith("+")) {
    return `+${raw.replace(/\D/g, "")}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  const code = (phoneCode ?? "").replace(/\D/g, "");
  return code ? `+${code}${digits}` : digits;
}

export interface SplitPhone {
  phoneCode: string;
  national: string;
}

/**
 * Separa un número E.164 (o un valor legacy) en código de país y parte
 * nacional. Usa el prefijo más largo que coincida con el catálogo para
 * resolver códigos ambiguos. Sin "+" devuelve el valor tal cual con el
 * código por defecto.
 */
export function splitE164(
  value: string | null | undefined,
  countries: CountryOption[],
  fallbackPhoneCode = ""
): SplitPhone {
  const raw = (value ?? "").trim();
  if (!raw) return { phoneCode: fallbackPhoneCode, national: "" };

  if (!raw.startsWith("+")) {
    return { phoneCode: fallbackPhoneCode, national: raw };
  }

  const digits = raw.replace(/\D/g, "");
  const match = countries
    .filter((c) => c.phoneCode && digits.startsWith(c.phoneCode))
    .sort((a, b) => b.phoneCode.length - a.phoneCode.length)[0];

  if (!match) return { phoneCode: fallbackPhoneCode, national: raw };

  return {
    phoneCode: match.phoneCode,
    national: digits.slice(match.phoneCode.length),
  };
}
