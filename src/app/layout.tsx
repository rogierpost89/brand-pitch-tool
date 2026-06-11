import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PDC Pitch Generator',
  description: 'Generate branded pitch decks for retail buyers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4 mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pdc-logo.png"
              alt="Pineapple Drinks Club"
              className="h-24 w-auto object-contain"
            />
            <span className="text-xs tracking-[2px] uppercase text-zinc-700">
              Pitch Generator
            </span>
          </div>
          {children}
        </div>
      </body>
    </html>
  )
}
