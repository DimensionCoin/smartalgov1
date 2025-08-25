// app/(pages)/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Exo, Rajdhani } from "next/font/google";
import "../globals.css";
import "@solana/wallet-adapter-react-ui/styles.css"; // ✅ moved here
import { Toaster } from "react-hot-toast";
import Header from "@/components/page/Header";
import { ClerkProvider } from "@clerk/nextjs";
import { UserProvider } from "@/providers/UserProvider";
import AppWalletProvider from "@/providers/WalletProvider";

const exo = Exo({
  variable: "--font-exo",
  subsets: ["latin"],
  display: "swap",
});
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SEEK",
  description: "Social Platform for Traders",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${exo.variable} ${rajdhani.variable} antialiased`}
    >
      <body className="bg-black text-white">
        <ClerkProvider>
          <UserProvider>
            <AppWalletProvider>
              <Toaster position="top-right" reverseOrder={false} />
              <Header />
              {children}
            </AppWalletProvider>
          </UserProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
