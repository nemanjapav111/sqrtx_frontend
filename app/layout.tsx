import type { Metadata } from "next";
import "./globals.css";
import { inter } from './fonts';

export const metadata: Metadata = {
  title: "sqrtx",
  description: "next-gen business platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
