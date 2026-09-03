import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  async redirects() {
    return [
      { source: "/program/today", destination: "/program/dashboard?view=hoy", permanent: false },
      { source: "/program/activity-log", destination: "/program/dashboard?view=bitacora", permanent: false },
      { source: "/program/cofres", destination: "/program/adherencia?view=cofres", permanent: false },
      { source: "/program/xp-rules", destination: "/program/adherencia?view=reglas-xp", permanent: false },
      { source: "/program/templates", destination: "/program/gestion?view=plantillas", permanent: false },
      { source: "/program/enrollments", destination: "/program/gestion?view=perfil-360", permanent: false },
      { source: "/program/enrollments/:id", destination: "/program/gestion?view=perfil-360&patient=:id", permanent: false },
      { source: "/program/content", destination: "/program/gestion?view=contenido", permanent: false },
      { source: "/program/scores", destination: "/program/gestion?view=perfil-360", permanent: false },
      { source: "/program/weaknesses", destination: "/program/clinica?view=debilidades", permanent: false },
      { source: "/program/adaptations", destination: "/program/clinica?view=adaptaciones", permanent: false },
      { source: "/program/interventions", destination: "/program/clinica?view=intervenciones", permanent: false },
      { source: "/program/patients/:id", destination: "/program/gestion?view=perfil-360&patient=:id", permanent: false },
    ];
  },
};

export default nextConfig;
