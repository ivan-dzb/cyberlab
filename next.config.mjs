import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Permite abrir el servidor de desarrollo desde otros dispositivos de la LAN.
  allowedDevOrigins: ["192.168.0.*"],
  // El contenido se lee del disco en runtime; incluirlo en el build standalone.
  outputFileTracingIncludes: { "/**": ["./content/**/*"] },
};

export default withNextIntl(nextConfig);
