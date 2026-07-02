/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Disables X-Powered-By header to prevent technology leakage
  allowedDevOrigins: ['192.168.1.17', 'localhost', '127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; frame-src 'self' https://www.google.com https://maps.google.com; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:8000 http://*.localhost:8000 http://127.0.0.1:8000 http://192.168.1.17:8000 https://*.railway.app https://*.onrender.com https://*.openstreetmap.org https://cdnjs.cloudflare.com; connect-src 'self' ws://localhost:3000 ws://*.localhost:3000 ws://127.0.0.1:3000 http://localhost:8000 http://*.localhost:8000 http://127.0.0.1:8000 http://192.168.1.17:8000 https://*.railway.app https://*.onrender.com https://*.vercel.app https://nominatim.openstreetmap.org; font-src 'self' data: https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';"
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig

