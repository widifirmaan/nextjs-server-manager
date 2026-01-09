/** @type {import('next').NextConfig} */
const nextConfig = {
    // Prevent bundling of native modules/libraries with issues
    serverExternalPackages: ["dockerode", "ssh2", "node-pty"],
};

module.exports = nextConfig;
