import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
    <html lang="en">
      <body className={`${inter.variable} ${firaCode.variable}`}>
        <div className="layout">
          <Sidebar />
          <main className="content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
