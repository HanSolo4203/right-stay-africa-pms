/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 15+: was experimental.serverComponentsExternalPackages
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@supabase/ssr",
    "@supabase/supabase-js",
    // Do not externalize @react-pdf/renderer or radix-ui — they must share the app's React instance.
    "@radix-ui/react-label",
    "@radix-ui/react-slot",
  ],
}

export default nextConfig
