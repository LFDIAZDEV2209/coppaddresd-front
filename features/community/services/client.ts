"use client";

import { authExchange } from "@urql/exchange-auth";
import { cacheExchange, Client, fetchExchange } from "urql";
import {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "@/lib/api/http";
import { env } from "@/lib/config/env";

// El access token del ERP vive en memoria (lib/api/http.ts). Se relee en cada
// operación para reflejar renovaciones hechas por otros flujos de la app.
let currentToken: string | null = getAccessToken();

const communityAuth = authExchange(async (utils) => ({
  addAuthToOperation(operation) {
    currentToken = getAccessToken();
    if (!currentToken) return operation;
    return utils.appendHeaders(operation, {
      Authorization: `Bearer ${currentToken}`,
    });
  },
  didAuthError(error) {
    return error.response?.status === 401;
  },
  async refreshAuth() {
    const outcome = await refreshAccessToken();
    if (outcome.ok && outcome.token) {
      setAccessToken(outcome.token);
      currentToken = outcome.token;
    }
  },
}));

/** Cliente GraphQL de la comunidad (urql) con autenticación del ERP. */
export const communityClient = new Client({
  // El servicio de comunidad expone el endpoint HTTP en /api/v1/community/graphql
  // y las suscripciones WS en /api/v1/community/subscriptions.
  url: `${env.communityApiUrl}/api/v1/community/graphql`,
  exchanges: [communityAuth, cacheExchange, fetchExchange],
});