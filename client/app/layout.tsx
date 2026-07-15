import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { TrustStrip } from "./trust-strip";

export const metadata: Metadata = {
  title: "MediStore — medicine delivered to your door",
  description: "Order OTC medicines and health essentials with cash on delivery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <footer className="mt-16 border-t border-slate-200 bg-white">
          <TrustStrip />
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-slate-500">
            <span>© {new Date().getFullYear()} MediStore</span>
            <nav className="flex gap-4">
              <Link href="/policy" className="hover:text-slate-900 hover:underline">
                Delivery &amp; COD policy
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
