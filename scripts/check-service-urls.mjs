import { pathToFileURL } from "node:url";

/** Las rutas de cada servicio las agrega el cliente, no el entorno de build. */
export function checkServiceUrls(environment) {
  for (const name of [
    "NEXT_PUBLIC_GATEWAY_URL",
    "NEXT_PUBLIC_COMMUNITY_API_URL",
  ]) {
    const value = environment[name];
    if (value === undefined) continue;
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} debe ser un origen HTTP(S) válido.`);
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      value !== value.trim()
    ) {
      throw new Error(
        `${name} debe contener solo el origen HTTP(S), sin rutas, parámetros ni credenciales.`,
      );
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkServiceUrls(process.env);
  console.log("URLs de servicios válidas.");
}
