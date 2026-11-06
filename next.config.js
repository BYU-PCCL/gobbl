/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/home", permanent: true },
      { source: "/leaderboard", destination: "/home", permanent: true },
      { source: "/profile", destination: "/home#you", permanent: false },
      {
        source: "/arena",
        destination: "/chat",
        permanent: true,
      },
      {
        source: "/arena/:path*",
        destination: "/chat/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
