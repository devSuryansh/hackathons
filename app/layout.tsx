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

const title = "cmd + shift + elite · HH Goa 2026 Frame Generator";
const description =
  "cmd + shift + elite's Hacker House Goa 2026 frame generator. Upload a photo, get a PFP, Builder ID, or team frame, then share on X with #FrameInGoa. No login.";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: title,
    template: "%s · cmd + shift + elite",
  },
  description,
  applicationName: "cmd + shift + elite",
  authors: [{ name: "cmd + shift + elite" }],
  creator: "cmd + shift + elite",
  publisher: "cmd + shift + elite",
  keywords: [
    "cmd + shift + elite",
    "cmd shift elite",
    "HH Goa 2026",
    "Hacker House Goa 2026",
    "HH Goa",
    "FrameInGoa",
    "#FrameInGoa",
    "PFP frame",
    "Builder ID",
    "photo frame generator",
    "2:47 studio",
  ],
  alternates: {
    canonical: absoluteUrl(),
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.webp",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: absoluteUrl(),
    siteName: "cmd + shift + elite",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  category: "technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: title,
  url: absoluteUrl(),
  description,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
  author: {
    "@type": "Organization",
    name: "cmd + shift + elite",
  },
  about: {
    "@type": "Event",
    name: "Hacker House Goa 2026",
    startDate: "2026-10-28",
    endDate: "2026-10-31",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Goa, India",
    },
    organizer: {
      "@type": "Organization",
      name: "2:47 pm Studio",
      url: "https://hhgoa.com",
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${victorMono.variable} ${imbue.variable} h-full w-full`}
    >
      <body className="min-h-full w-full flex flex-col antialiased scroll-smooth">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
