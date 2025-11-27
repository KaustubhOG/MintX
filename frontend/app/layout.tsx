import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "@solana/wallet-adapter-react-ui/styles.css"; // <-- REQUIRED
import "./globals.css";

import WalletContextProvider from "./wallet/WalletContextProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MintX",
  description: "Token Mint + Vesting Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
