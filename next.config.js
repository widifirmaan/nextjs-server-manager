/** @type {import('next').NextConfig} */
const nextConfig = {
    // Prevent bundling of native modules/libraries with issues
    serverExternalPackages: ["dockerode", "ssh2", "node-pty"],
    // Optimization for limited hardware
    poweredByHeader: false,
    reactStrictMode: true,
    devIndicators: {
        buildActivity: false,
        appIsrStatus: false,
    },
};

module.exports = nextConfig;
