# 🖥️ Tunneled Server Manager - Modern Web Infrastructure Hub

**Tunneled Server Manager** is a state-of-the-art, web-based management dashboard designed for home labs and servers tucked behind ISP-NAT environments. Built with **Next.js 15+** and **React 19**, it offers a secure, high-performance interface to monitor system health, manage Docker containers, and access a web terminal from anywhere—without exposing your public IP or requiring port forwarding.

![Status](https://img.shields.io/badge/Status-Active_Development-success?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwindcss)
![Docker](https://img.shields.io/badge/Docker-Latest-blue?style=for-the-badge&logo=docker)

---

## 📸 Application Showcase

Explore the comprehensive features of **Tunneled Server Manager** through our gallery.

| | |
|:---:|:---:|
| ![Dashboard](screenshots/dashboard.png)<br>**System Overview** | ![Docker](screenshots/docker.png)<br>**Container Management** |
| ![Tunnels](screenshots/tunnels.png)<br>**Cloudflare Tunnels** | ![Terminal](screenshots/terminal.png)<br>**Web Terminal** |
| ![Mobile](screenshots/mobile.png)<br>**Mobile Responsive** | **Stay Tuned** |

---

## 🚀 Features Overview

### 📊 System Monitoring
*   **Real-time Visualization**: Monitor CPU usage, Memory, Disk Space, and Server Uptime with beautiful charts.
*   **Dynamic UI**: Auto-updating statistics powered by WebSockets for an instant feel.
*   **Deep Integration**: Powered by `systeminformation` to provide accurate hardware data.

### 🐳 Docker Management
*   **Container Ops**: View, start, stop, restart, and remove containers with a single click.
*   **Health Tracking**: Monitor container status, image details, and runtime information.
*   **Secure API**: Interaction via `dockerode` specifically protected behind authentication.

### ⌨️ Web Terminal
*   **SSH-like Experience**: Fully functional terminal in your browser with support for complex commands.
*   **Real-time Stream**: Powered by `node-pty` and `xterm.js` for low-latency command execution.
*   **Encrypted Traffic**: Tunnel your shell access securely through Cloudflare without open ports.

### 🌐 Cloudflare Tunnels
*   **ISP-NAT Solution**: Perfect for servers behind CG-NAT or those without a Static IP.
*   **Tunnel Management**: Monitor tunnel status and manage connections directly from the dashboard.
*   **No Port-Forwarding**: Secure your server while keeping all ports closed to the public internet.

### 🛡️ Security First
*   **Authenticated Access**: Every management action is protected by password authentication.
*   **Secure Cookies**: Session management using `HttpOnly` and `SameSite` flags.
*   **Client Protection**: Built-in DevTools detection to deter inspection of authenticated sessions.

---

## 🛠 Tech Stack

### Frontend & UI
*   **Framework**: Next.js 15+ (App Router)
*   **Style**: Tailwind CSS + Custom Cyberpunk/Neo-Brutalist design
*   **Animations**: Framer Motion for smooth transitions and hover effects
*   **Icons**: Lucide React Icons

### Backend & Core
*   **Runtime**: Node.js (Custom server implementation)
*   **Real-time**: Socket.IO for terminal streams and resource updates
*   **System Utilities**: `dockerode` (Docker), `node-pty` (Terminal), `systeminformation` (Stats)

---

## 📂 Project Structure

```bash
/
├── src/
│   ├── app/                # Next.js App Router (Pages & API)
│   ├── components/         # Modular UI Components
│   └── middleware.ts       # Auth and Security Middleware
├── public/                 # Static Assets (Images, Icons)
├── screenshots/            # Project showcase snapshots
├── server.js               # Custom Socket.IO & Next.js Server
├── package.json            # Scripts & Dependencies
└── tsconfig.json           # TypeScript Configuration
```

---

## 📦 Getting Started

### Prerequisites
*   **Node.js 18+**
*   **Docker** (Installed and running on the host)
*   **Cloudflare Tunnel** (cloudflared) installed and configured

### Setup Instructions

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/widifirmaan/nextjs-server-manager.git
    cd nextjs-server-manager
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root:
    ```env
    AUTH_PASSWORD=YourVerySecurePassword
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```
    *Open `http://localhost:3000` in your browser.*

---

## 👥 Authors

Developed by **Widi Firmaan**.

---

## 📜 License

This project is open source.
