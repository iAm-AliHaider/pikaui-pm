import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleContext";
import { UserProvider } from "@/components/UserContext";

export const metadata: Metadata = {
  title: "pikAui PM — Voice Project Management",
  description: "Manage your projects, tasks, and sprints with your voice. Built for German and English teams.",
  manifest: "/manifest.json",
  openGraph: {
    title: "pikAui PM — Voice Project Management",
    description: "Manage your projects, tasks, and sprints with your voice. Built for German and English teams.",
    url: "https://pikaui-pm.middlemind.ai",
    siteName: "pikAui PM",
    type: "website",
    locale: "en",
    images: [
      {
        url: "https://pikaui-pm.middlemind.ai/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "pikAui PM Voice Project Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@MiddleMindAI",
    creator: "@MiddleMindAI",
  },
  alternates: {
    canonical: "https://pikaui-pm.middlemind.ai",
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProjectManagementSoftware",
    "name": "pikAui PM",
    "description": "Voice-first project management tool for managing projects, tasks, and sprints with natural language.",
    "url": "https://pikaui-pm.middlemind.ai",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    "provider": {
      "@type": "Organization",
      "name": "MiddleMind",
      "url": "https://middlemind.ai",
    },
    "availableLanguage": ["English", "German"],
  };

  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased" style={{ background: "#f8f9fc", color: "#111827" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <UserProvider>
          <LocaleProvider>
            {children}
          </LocaleProvider>
        </UserProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  );
}
