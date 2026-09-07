import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/shared/components/providers";
import { Navbar } from "@/shared/components/navbar";
import { Footer } from "@/shared/components/footer";

export const metadata: Metadata = {
  title: "Hum Watan",
  description: "A free, verified platform for Kashmiri students and diaspora worldwide.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
