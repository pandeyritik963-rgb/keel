import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/shell/Header";
import { Footer } from "@/components/shell/Footer";
import { Providers } from "@/components/wallet/Providers";

// Manrope for text/headings, JetBrains Mono for every number (tabular, slashed-zero).
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const jbMono = JetBrains_Mono({ variable: "--font-jbmono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Keel — stack through the storm",
  description:
    "Flow-driven smart DCA. Accumulate BTC and ETH on a schedule while the brain sizes each buy from live SoSoValue institutional ETF flows. Non-custodial.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jbMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
