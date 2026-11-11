/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/skills", destination: "/flock", permanent: true },
      { source: "/dashboard", destination: "/home", permanent: true },
      { source: "/leaderboard", destination: "/friends", permanent: true },
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
