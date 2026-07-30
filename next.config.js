/** @type {import('next').NextConfig} */
const nextConfig = {
  // Kept intentionally minimal (NFR-3: single deployable unit, no
  // custom server or extra infra needed for this project's scope).
  reactStrictMode: true,
};

module.exports = nextConfig;
