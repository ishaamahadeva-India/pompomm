import type { Metadata, Viewport } from "next";
import { PT_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthRefreshProvider } from "@/components/AuthRefreshProvider";
import { PwaRegister } from "@/components/PwaRegister";
import PremiumSplash from "@/components/PremiumSplash";

const ptSans = PT_Sans({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pt-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pom Pomm — Creator Performance Platform",
  description: "Performance-based creator marketing system",
  manifest: "/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pom Pomm",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0a0614",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${ptSans.variable} font-sans antialiased min-h-screen bg-background text-foreground safe-area-padding app-theme`}>
        <PremiumSplash />
        <Header />
        <PwaRegister />
        <AuthRefreshProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1 pt-16">{children}</div>
            <Footer />
          </div>
        </AuthRefreshProvider>
      </body>
    </html>
  );
}
