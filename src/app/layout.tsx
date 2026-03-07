import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

import DevToolsBlocker from "@/components/DevToolsBlocker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Server Manager",
  description: "Next.js Server Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${firaCode.variable}`}>
        <DevToolsBlocker />
        <div className="layout">
          <Sidebar />
          <main className="content relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
