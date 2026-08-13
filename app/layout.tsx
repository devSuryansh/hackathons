import { Imbue, Victor_Mono } from "next/font/google";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import "./globals.css";

const victorMono = Victor_Mono({
  variable: "--font-victor-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const imbue = Imbue({
  variable: "--font-imbue",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: "HH Goa 2026 Frame Generator",
  description:
    "Upload a photo, get a branded PFP frame or Builder ID for Hacker House Goa 2026. Download and share on X with #FrameInGoa.",
  icons: {
    icon: "/favicon.webp",
  },
  openGraph: {
    title: "HH Goa 2026 Frame Generator",
    description: "PFP frame and Builder ID. Share with #FrameInGoa.",
    url: absoluteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "HH Goa 2026 Frame Generator",
    description: "PFP frame and Builder ID. Share with #FrameInGoa.",
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
