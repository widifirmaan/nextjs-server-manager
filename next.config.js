/** @type {import('next').NextConfig} */
const nextConfig = {
    // Prevent bundling of native modules/libraries with issues
    serverExternalPackages: ["dockerode", "ssh2", "node-pty"],
    devIndicators: {
        buildActivity: false,
        appIsrStatus: false,
    },
};

module.exports = nextConfig;
