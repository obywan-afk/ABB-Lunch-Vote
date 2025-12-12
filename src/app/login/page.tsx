'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const ThreeGridBackground = dynamic(
  () =>
    import('../../components/ThreeGridBackground').then(
      (mod) => mod.ThreeGridBackground,
    ),
  { ssr: false },
);

/**
 * Material 2025 Login Card
 * 
 * Features:
 * - Glassmorphism: Translucent white glass with heavy blur
 * - Super-rounded corners (32px)
 * - Typography: Clean Inter/System font, large distinct headers
 * - Interactions: Smooth focus states, glowing buttons
 */
export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to continue.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store auth details
        sessionStorage.setItem('abb-lunch-vote-auth', 'true');
        sessionStorage.setItem('abb-lunch-vote-user', name.trim());
        
        // Store team info if present
        if (data.team) {
          sessionStorage.setItem('abb-lunch-vote-team', data.team);
        }
        
        router.push('/');
      } else {
        toast({
          title: 'Login Failed',
          description: 'The password you entered is incorrect.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login request failed:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white font-sans antialiased">
      {/* 3D Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <ThreeGridBackground />
      </div>
      
      {/* Subtle overlay to dampen background contrast slightly */}
      <div className="absolute inset-0 z-10 bg-slate-950/20" />

      {/* Main Content Area */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        
        {/* "Material 2025" Card */}
        <div className="w-full max-w-[440px] rounded-[40px] bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl p-1">
          <div className="rounded-[36px] bg-white/60 p-8 md:p-12 shadow-inner ring-1 ring-white/50 backdrop-blur-md">
            <form onSubmit={handleLogin} className="flex flex-col gap-8">
              
              {/* Header Section */}
              <div className="text-center space-y-2">
                <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
                  Menu Voting
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Lunch Vote
                </h1>
                <p className="text-sm text-slate-500 mt-2">
                  Identify yourself. Enter the key. Proceed.
                </p>
              </div>

              {/* Inputs Section */}
              <div className="space-y-5">
                {/* Floating Label / Modern Filled Input - Name */}
                <div className="group relative">
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="peer w-full rounded-2xl bg-white px-5 pt-6 pb-2 text-base font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:shadow-md"
                    placeholder="Name"
                  />
                  <label
                    htmlFor="name"
                    className="pointer-events-none absolute left-5 top-4 origin-[0] -translate-y-2 scale-75 transform text-xs text-slate-400 transition-all peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-2 peer-focus:scale-75 peer-focus:text-indigo-600"
                  >
                    Name
                  </label>
                </div>

                {/* Floating Label / Modern Filled Input - Password */}
                <div className="group relative">
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="peer w-full rounded-2xl bg-white px-5 pt-6 pb-2 text-base font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:shadow-md"
                    placeholder="Access Key"
                  />
                  <label
                    htmlFor="password"
                    className="pointer-events-none absolute left-5 top-4 origin-[0] -translate-y-2 scale-75 transform text-xs text-slate-400 transition-all peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-2 peer-focus:scale-75 peer-focus:text-indigo-600"
                  >
                    Access key
                  </label>
                </div>
              </div>

              {/* Action Section */}
              <div className="space-y-6 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-14 w-full rounded-full bg-slate-900 text-base font-medium text-white shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.02] hover:bg-black hover:shadow-xl active:scale-[0.98]"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Authenticating...
                    </span>
                  ) : (
                    'Enter Lunch Lab'
                  )}
                </Button>
                
                <p className="text-center text-xs font-medium text-slate-600 opacity-80">
                   Authorized personnel only. Ping Lars if you need backup.
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
