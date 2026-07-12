import type { Metadata } from 'next';
import './globals.css';
import ParticleBackground from '@/components/ParticleBackground';

export const metadata: Metadata = {
  title: 'Creator Voice Tools — Real-Time Voice Presets for Creators',
  description: 'Real-time voice presets for gamers, streamers, and content creators.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css"
        />
      </head>
      <body>
        <ParticleBackground />
        {children}
      </body>
    </html>
  );
}
