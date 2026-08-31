import { apiFetch } from "./http";
import { env } from "@/lib/config/env";

export interface UserPreferenceResponse {
  lang: string | null;
  accentColor: string | null;
}

export interface UpdateUserPreferenceRequest {
  lang?: string;
  accentColor?: string;
}

export async function getPreferences(): Promise<UserPreferenceResponse> {
  return apiFetch<UserPreferenceResponse>(
    `${env.apiUrl}/api/auth/me/preferences`,
  );
}

export async function updatePreferenceLang(lang: string): Promise<void> {
  await apiFetch(`${env.apiUrl}/api/auth/me/preferences`, {
    method: "PUT",
    body: JSON.stringify({ lang } satisfies UpdateUserPreferenceRequest),
  });
}

export async function updatePreferenceAccentColor(
  accentColor: string,
): Promise<void> {
  await apiFetch(`${env.apiUrl}/api/auth/me/preferences`, {
    method: "PUT",
    body: JSON.stringify({ accentColor } satisfies UpdateUserPreferenceRequest),
  });
}
