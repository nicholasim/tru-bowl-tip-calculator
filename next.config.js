/** @type {import('next').NextConfig} */
const nextConfig = {
  // Linting stays a separate `npm run lint` step (as it was under Vite,
  // which never ran eslint as part of `vite build`) rather than gating
  // the production build on it.
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
