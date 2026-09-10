import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kachis",
    template: "%s · Kachis",
  },
  description:
    "Enterprise data shield for AI. Internal records stay in your local sandbox.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", dmSans.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full bg-bg font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
