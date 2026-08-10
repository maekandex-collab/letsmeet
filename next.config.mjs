/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    // Coolify/Nixpacks builds OOM or fail on non-blocking lint noise; keep local `npm run lint`.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "randomuser.me" },
    ],
  },
};

export default nextConfig;
