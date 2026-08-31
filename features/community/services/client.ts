"use client";

import { authExchange } from "@urql/exchange-auth";
import { cacheExchange, Client, fetchExchange, subscriptionExchange } from "urql";
import { createClient as createWSClient } from "graphql-ws";
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

function getWsUrl(): string {
  const httpUrl = env.communityApiUrl;
  const wsBase = httpUrl.replace(/^http/, "ws");
  return `${wsBase}/api/v1/community/subscriptions`;
}

const wsClient =
  typeof window !== "undefined"
    ? createWSClient({
        url: getWsUrl(),
        lazy: true,
        retryAttempts: 5,
        connectionParams: () => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      })
    : null;

const communitySubscriptionExchange = subscriptionExchange({
  forwardSubscription(request) {
    if (!wsClient) {
      return {
        subscribe(sink) {
          sink.error(new Error("WebSocket no disponible en servidor"));
          return { unsubscribe() {} };
        },
      };
    }
    const input = {
      query: request.query as string,
      variables: request.variables as Record<string, unknown> | undefined,
    };
    return {
      subscribe(sink) {
        const unsubscribe = wsClient.subscribe(input, {
          next: (value) => sink.next(value as never),
          error: (err) => sink.error(err as never),
          complete: () => sink.complete(),
        });
        return { unsubscribe };
      },
    };
  },
});

/** Cliente GraphQL de la comunidad (urql) con autenticación del ERP. */
export const communityClient = new Client({
  // El servicio de comunidad expone el endpoint HTTP en /api/v1/community/graphql
  // y las suscripciones WS en /api/v1/community/subscriptions.
  url: `${env.communityApiUrl}/api/v1/community/graphql`,
  exchanges: [communityAuth, cacheExchange, communitySubscriptionExchange, fetchExchange],
});