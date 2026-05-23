/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 15+: was experimental.serverComponentsExternalPackages
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@supabase/ssr",
    "@supabase/supabase-js",
    "@react-pdf/renderer",
    "radix-ui",
    "@radix-ui/react-label",
    "@radix-ui/react-slot",
  ],
}

export default nextConfig
