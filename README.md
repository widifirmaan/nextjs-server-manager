# Server Manager Dashboard

A modern, web-based dashboard to manage your Linux server.

## Features

- **System Overview**: Monitor CPU, RAM, Disk, and Load in real-time.
- **Docker Management**: List containers, view status, start/stop/restart containers.
- **Cloudflare Tunnels**: Manage ingress rules (subdomains/ports) for your `cloudflared` tunnel.
- **Web Terminal**: Full terminal access directly from your browser.

## Prerequisites

- **Node.js**
- **Docker** (accessible via `/var/run/docker.sock`, likely requires the user to be in the `docker` group).
- **Cloudflare Tunnel (`cloudflared`)** configured at `~/.cloudflared/config.yml` or `/etc/cloudflared/config.yml`.

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

## Running

Start the server (runs on port 3000 by default):

```bash
npm start
```

Access the dashboard at [http://localhost:3000](http://localhost:3000).

## Security Note

This dashboard provides **root-level access** (via Docker and Terminal) to your server. 
**Do not expose this directly to the public internet** without protection.
Recommended protection: use Cloudflare Access (Zero Trust) to put this behind a login screen if you expose it via a Tunnel.

## Configuration

- **Port**: Change `port` in `server.js` if needed.
- **Cloudflare Config**: The app looks for `config.yml` in `~/.cloudflared/` or `/etc/cloudflared/`.
