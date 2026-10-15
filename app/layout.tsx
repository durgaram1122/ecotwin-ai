import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EcoTwin AI — Smart Sustainable Campus',
  description: 'Evidence-led sustainability operations for a living campus digital twin.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
