"use client";

import dynamic from "next/dynamic";

/**
 * Sala virtual de Citas. El import dinámico con `ssr: false` vive en un
 * Client Component (requisito de Next.js 16): el SDK de video y las APIs de
 * medios del navegador (getUserMedia, WebRTC) no existen en el servidor.
 */
const VirtualRoom = dynamic(
  () => import("@/features/appointments/components/virtual-room").then((m) => m.VirtualRoom),
  { ssr: false },
);

export default function Page() {
  return <VirtualRoom />;
}