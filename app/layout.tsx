import type { Metadata } from "next";
import { Space_Mono, Unbounded } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Chaitanya Gidwani — CHAITANYA_OS",
  description:
    "Operating-system portfolio of Chaitanya Gidwani — full-stack developer and agentic-AI engineer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${unbounded.variable}`}>
      <body>{children}</body>
    </html>
  );
}
