import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las plantillas .docx se leen con fs en tiempo de ejecución.
  outputFileTracingIncludes: { "/p/**": ["./templates/**/*"] },
};

export default nextConfig;
