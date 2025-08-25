import type React from "react";
import type { Metadata } from "next";
import { Exo, Rajdhani } from "next/font/google";
import "../globals.css";
import { Toaster } from "react-hot-toast";
import Header from "@/components/page/Header";
import { ClerkProvider } from "@clerk/nextjs";
import { UserProvider } from "@/providers/UserProvider";

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${exo.variable} ${rajdhani.variable} antialiased`}
    >
      <ClerkProvider>
        <UserProvider>
          <body className="bg-black text-white">
            <Toaster position="top-right" reverseOrder={false} />
            <Header />
            {children}
          </body>
        </UserProvider>
      </ClerkProvider>
    </html>
  );
}
