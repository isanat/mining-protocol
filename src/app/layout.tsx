import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mining Protocol - Plataforma de Mineração de Criptomoedas",
  description: "Aluguel de hashpower com retornos reais. Invista em mineração de Bitcoin e criptomoedas com rendimentos diários.",
  keywords: ["Bitcoin", "Mineração", "Criptomoedas", "Hashpower", "Investimento", "BTC", "USDT"],
  authors: [{ name: "Mining Protocol Team" }],
  
  // PWA Meta Tags
  manifest: "/manifest.json",
  
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  
  // Apple PWA Meta Tags
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mining Protocol",
  },
  
  // Open Graph
  openGraph: {
    title: "Mining Protocol - Mineração de Criptomoedas",
    description: "Aluguel de hashpower com retornos reais. Invista em mineração de Bitcoin.",
    url: "https://mining-protocol.com",
    siteName: "Mining Protocol",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Mining Protocol Logo",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Mining Protocol",
    description: "Plataforma de mineração de criptomoedas",
    images: ["/icon-512.png"],
  },
  
  // Other PWA related
  formatDetection: {
    telephone: false,
  },
  
  // App links for mobile
  other: {
    "mobile-web-app-capable": "true",
    "apple-mobile-web-app-capable": "true",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "MiningPro",
    "application-name": "Mining Protocol",
    "msapplication-TileColor": "#f59e0b",
    "msapplication-tap-highlight": "none",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f59e0b" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://api.coingecko.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        
        {/* Splash screens for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Theme color for address bar */}
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-black focus:rounded-lg"
        >
          Pular para o conteúdo principal
        </a>
        
        {children}
        
        <Toaster />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration.scope);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
