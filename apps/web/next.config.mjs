/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui",  "@workspace/shared"],
    reactStrictMode: false,
}

export default nextConfig
