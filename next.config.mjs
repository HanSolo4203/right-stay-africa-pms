/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 15+: was experimental.serverComponentsExternalPackages
  serverExternalPackages: [
    "@supabase/ssr",
    "@supabase/supabase-js",
    "radix-ui",
    "@radix-ui/react-label",
    "@radix-ui/react-slot",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
}

export default nextConfig
