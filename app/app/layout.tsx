import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation, Footer } from "@/components/layout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BaseCenter.ai - Business software that adapts to how you work",
  description: "All-in-one AI-powered business platform with 10 modular tools. Start with one module free forever, add more for just $5/month each.",
  keywords: "business management software, AI business tools, invoicing, project management, CRM, accounting software",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
