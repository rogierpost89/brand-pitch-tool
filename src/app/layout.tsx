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
          <div className="flex items-center gap-3 mb-10">
            <div className="w-3 h-3 bg-[#f8d418]" />
            <span className="text-xs font-bold tracking-[3px] uppercase text-zinc-500">
              Pineapple Drinks Club
            </span>
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
