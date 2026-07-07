'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { login } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await login(email, password);
      authLogin(token, user);
      // Use hard navigation so the new page's AuthContext reads the token
      // fresh from localStorage, avoiding a race with React state propagation
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo1234');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg border-border/50 backdrop-blur-sm bg-card/80">
        <CardHeader className="space-y-3 text-center pt-8">
          <div className="mx-auto bg-primary w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
            <FileText className="text-primary-foreground" size={24} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-background/50"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-background/50"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="rounded-lg bg-muted/50 p-4 text-sm border border-border/50">
            <p className="font-medium mb-3 text-foreground flex items-center gap-2">
              <span>🎭</span> Demo Accounts
            </p>
            <div className="space-y-2 font-mono text-xs text-muted-foreground">
              <button 
                onClick={() => fillDemo('alice@demo.com')} 
                className="w-full text-left px-3 py-2 rounded-md hover:bg-background hover:text-foreground transition-colors border border-transparent hover:border-border"
                type="button"
              >
                alice@demo.com <span className="text-muted-foreground/50 mx-1">/</span> demo1234
              </button>
              <button 
                onClick={() => fillDemo('bob@demo.com')} 
                className="w-full text-left px-3 py-2 rounded-md hover:bg-background hover:text-foreground transition-colors border border-transparent hover:border-border"
                type="button"
              >
                bob@demo.com <span className="text-muted-foreground/50 mx-1">/</span> demo1234
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-8">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
