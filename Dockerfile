FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable

FROM base AS deps

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn install --immutable

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml

COPY . .

ARG NEXT_PUBLIC_AUTH_API_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TELEMEDICINE_API_URL
ARG NEXT_PUBLIC_APPLICATION_CODE
ARG NEXT_PUBLIC_SESSION_IDLE_MINUTES

ENV NEXT_PUBLIC_AUTH_API_URL=
ENV NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_TELEMEDICINE_API_URL=
ENV NEXT_PUBLIC_APPLICATION_CODE=
ENV NEXT_PUBLIC_SESSION_IDLE_MINUTES=

RUN yarn build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
