import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lumina AI Platform",
  description: "Ultra-premium voice AI interviewing experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
        <body className={`${outfit.className} min-h-screen bg-background antialiased selection:bg-cyan-500/30 selection:text-cyan-50`}>
          <main className="relative flex flex-col min-h-screen">
            {children}
            <Toaster theme="dark" position="top-center" />
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
