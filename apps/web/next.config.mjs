/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@susmi/shared'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: `${process.env.API_URL || 'http://localhost:3001'}/api/:path*`,
            },
            {
                source: '/api/ai/:path*',
                destination: `${process.env.AI_SERVICE_URL || 'http://localhost:8001'}/:path*`,
            },
        ];
    },
};

export default nextConfig;
