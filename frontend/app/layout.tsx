import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'WorkspaceDoc — Collaborative Document Editor',
  description: 'Create, edit, and share rich-text documents with your team.',
};

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'dummy-client-id';

  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased bg-[radial-gradient(ellipse_at_20%_50%,rgba(99,102,241,0.08)_0%,transparent_50%),radial-gradient(ellipse_at_80%_10%,rgba(139,92,246,0.06)_0%,transparent_50%)]">
        <GoogleOAuthProvider clientId={clientId}>
          <AuthProvider>{children}</AuthProvider>
        </GoogleOAuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
