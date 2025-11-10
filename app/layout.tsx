import type { Metadata } from "next";
import { Raleway, Quando } from "next/font/google";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const quando = Quando({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spinwellness & Yoga | Employee Wellness, Therapy, and Culture Design",
  description:
    "Spinwellness & Yoga delivers tailored employee wellness programs, immersive therapy support, and on-demand resources designed to elevate team wellbeing.",
  keywords: [
    "employee wellness",
    "corporate wellness",
    "therapy support",
    "yoga sessions",
    "mental health at work",
    "spinwellness",
    "wellness culture design",
    "holistic wellbeing",
  ],
  openGraph: {
    title: "Spinwellness & Yoga | Holistic Employee Wellness",
    description:
      "Join the Spinwellness & Yoga waitlist and be first to access bespoke wellness programs, therapy sessions, and 24/7 resources.",
    type: "website",
    url: "https://spinwellness.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spinwellness & Yoga",
    description:
      "Holistic employee wellness programs and 1:1 therapy. Join the waitlist today.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${raleway.variable} ${quando.variable}`}>
      <body>{children}</body>
    </html>
  );
}

