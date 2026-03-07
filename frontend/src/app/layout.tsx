import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleContext";

export const metadata: Metadata = {
  title: "pikAui PM — Voice Project Management",
  description: "Manage your projects, tasks, and sprints with your voice",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "pikAui PM",
  },
};

export const viewport: Viewport = {
  themeColor: "#6c5ce7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased" style={{ background: "#f8f9fc", color: "#111827" }}>
        <LocaleProvider>
          {children}
        </LocaleProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  );
}
