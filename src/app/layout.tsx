import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ForesightTCG",
  description: "Your Pokémon TCG match tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-zinc-950 text-white`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}