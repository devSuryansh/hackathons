import type { Metadata } from "next";
import { Imbue, Victor_Mono } from "next/font/google";
import "./globals.css";

const victorMono = Victor_Mono({
  variable: "--font-victor-mono",
  subsets: ["latin"],
  display: "swap",
});

const imbue = Imbue({
  variable: "--font-imbue",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HH GOA | Hacker House Goa 2026",
  description:
    "4 days. one rhythm. everything intentional. Join us for an experimental hackathon experience in Goa, India.",
  icons: {
    icon: "/favicon.webp",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${victorMono.variable} ${imbue.variable} h-full w-full`}
    >
      <body className="min-h-full w-full flex flex-col antialiased scroll-smooth">
        {children}
      </body>
    </html>
  );
}
