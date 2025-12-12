'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type ThreeGridBackgroundProps = {
  windSpeed?: number;
  waveHeight?: number;
  lighting?: number;
  paused?: boolean;
};

const ThreeGridBackground = dynamic<ThreeGridBackgroundProps>(
  () =>
    import('../../components/ThreeGridBackground').then(
      (mod) => mod.ThreeGridBackground,
    ),
  { ssr: false },
);

type DaySelection =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

const DAY_BY_INDEX: Record<number, DaySelection | undefined> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

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
  const [windSpeed, setWindSpeed] = useState(8);
  const [waveHeight, setWaveHeight] = useState(0.9);
  const [lighting, setLighting] = useState(1.1);
  const [paused, setPaused] = useState(false);
  const [showTweak, setShowTweak] = useState(false);
  const [minimizedLogin, setMinimizedLogin] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const prefetch = async (day: DaySelection, language: 'en' | 'fi') => {
      const key = `abb-lunch-vote-prefetch:menus:${day}:${language}`;
      try {
        const existing = sessionStorage.getItem(key);
        if (existing) {
          const parsed = JSON.parse(existing) as { at: number };
          const maxAgeMs = 10 * 60 * 1000;
          if (parsed?.at && Date.now() - parsed.at < maxAgeMs) return;
        }
      } catch {
        // ignore
      }

      try {
        const params = new URLSearchParams({ language });
        params.set('day', day);
        const res = await fetch(`/api/menus?${params.toString()}`);
        const payload = await res.json();
        sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), payload }));
      } catch {
        // ignore prefetch failures
      }
    };

    const day: DaySelection = DAY_BY_INDEX[new Date().getDay()] ?? 'tuesday';

    const run = () => {
      void prefetch(day, 'en');
      void prefetch(day, 'fi');
    };

    if (typeof (window as any).requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(run, { timeout: 1500 });
      return;
    }

    const id = window.setTimeout(run, 250);
    return () => window.clearTimeout(id);
  }, []);

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
    <div className="relative min-h-screen overflow-hidden text-white font-sans antialiased">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <ThreeGridBackground
          windSpeed={windSpeed}
          waveHeight={waveHeight}
          lighting={lighting}
          paused={paused}
        />
      </div>
      
      {/* Subtle overlay to dampen background contrast slightly */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-black/10" />

      {/* Main Content Area */}
      {!minimizedLogin ? (
        <div className="pointer-events-none relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="pointer-events-auto w-full max-w-[440px]">
            <div className="rounded-[40px] bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl p-1">
              <div className="rounded-[36px] bg-white/60 p-8 md:p-12 shadow-inner ring-1 ring-white/50 backdrop-blur-md">
                <div className="mb-6 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setMinimizedLogin(true)}
                    className="rounded-full border border-slate-900/10 bg-white/60 px-4 py-2 text-xs font-medium text-slate-900 transition hover:bg-white"
                  >
                    Minimize
                  </button>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-6">
                  <div className="space-y-4">
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl bg-white px-5 py-4 text-base font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:shadow-md"
                      placeholder="Name"
                      autoComplete="name"
                    />

                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl bg-white px-5 py-4 text-base font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:shadow-md"
                      placeholder="Access key"
                      autoComplete="current-password"
                    />
                  </div>

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
                      'Login'
                    )}
                  </Button>
                </form>
              </div>
            </div>

            {/* Tweak UI (centered under login card) */}
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowTweak((v) => !v)}
                className="rounded-full border border-white/15 bg-[#0a1a22]/45 px-5 py-2.5 text-xs font-medium text-white/90 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-xl hover:bg-[#0a1a22]/60"
              >
                {showTweak ? 'Hide tweaks' : 'Tweak'}
              </button>
            </div>

            {showTweak ? (
              <div className="mt-4 rounded-[18px] border border-white/10 bg-[#0a1a22]/50 px-[14px] py-[12px] shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold tracking-wide text-white/85">
                    Ocean controls
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[3px] text-xs text-white/60">
                    {paused ? 'Paused' : 'Running'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl px-2 py-2 hover:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="wind" className="text-sm text-white/90">
                        Wind speed
                      </label>
                      <span className="text-sm tabular-nums text-white/60">
                        {windSpeed.toFixed(1)}
                      </span>
                    </div>
                    <input
                      id="wind"
                      type="range"
                      min={0}
                      max={20}
                      step={0.1}
                      value={windSpeed}
                      onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                      className="mt-2 w-full accent-sky-200"
                    />
                  </div>

                  <div className="rounded-xl px-2 py-2 hover:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="height" className="text-sm text-white/90">
                        Wave height
                      </label>
                      <span className="text-sm tabular-nums text-white/60">
                        {waveHeight.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id="height"
                      type="range"
                      min={0}
                      max={3.5}
                      step={0.01}
                      value={waveHeight}
                      onChange={(e) => setWaveHeight(parseFloat(e.target.value))}
                      className="mt-2 w-full accent-sky-200"
                    />
                  </div>

                  <div className="rounded-xl px-2 py-2 hover:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="light" className="text-sm text-white/90">
                        Lighting (clear → overcast)
                      </label>
                      <span className="text-sm tabular-nums text-white/60">
                        {lighting.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id="light"
                      type="range"
                      min={0.2}
                      max={2.2}
                      step={0.01}
                      value={lighting}
                      onChange={(e) => setLighting(parseFloat(e.target.value))}
                      className="mt-2 w-full accent-sky-200"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/60">
                  <button
                    type="button"
                    onClick={() => {
                      setWindSpeed(8);
                      setWaveHeight(0.9);
                      setLighting(1.1);
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 hover:bg-white/10"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 hover:bg-white/10"
                  >
                    {paused ? 'Resume' : 'Pause'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none fixed left-1/2 top-6 z-20 -translate-x-1/2">
          <button
            type="button"
            onClick={() => setMinimizedLogin(false)}
            className="pointer-events-auto rounded-full border border-white/10 bg-[#0a1a22]/45 px-4 py-2 text-xs font-medium text-white/90 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-xl hover:bg-[#0a1a22]/60"
          >
            Show login
          </button>
        </div>
      )}

      {minimizedLogin ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-20 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2">
          <div className="pointer-events-auto">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowTweak((v) => !v)}
                className="rounded-full border border-white/15 bg-[#0a1a22]/45 px-5 py-2.5 text-xs font-medium text-white/90 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-xl hover:bg-[#0a1a22]/60"
              >
                {showTweak ? 'Hide tweaks' : 'Tweak'}
              </button>
            </div>

            {showTweak ? (
              <div className="mt-3 rounded-[18px] border border-white/10 bg-[#0a1a22]/50 px-[14px] py-[12px] shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold tracking-wide text-white/85">
                    Ocean controls
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-[3px] text-xs text-white/60">
                    {paused ? 'Paused' : 'Running'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl px-2 py-2 hover:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="wind" className="text-sm text-white/90">
                        Wind speed
                      </label>
                      <span className="text-sm tabular-nums text-white/60">
                        {windSpeed.toFixed(1)}
                      </span>
                    </div>
                    <input
                      id="wind"
                      type="range"
                      min={0}
                      max={20}
                      step={0.1}
                      value={windSpeed}
                      onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                      className="mt-2 w-full accent-sky-200"
                    />
                  </div>

                  <div className="rounded-xl px-2 py-2 hover:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="height" className="text-sm text-white/90">
                        Wave height
                      </label>
                      <span className="text-sm tabular-nums text-white/60">
                        {waveHeight.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id="height"
                      type="range"
                      min={0}
                      max={3.5}
                      step={0.01}
                      value={waveHeight}
                      onChange={(e) => setWaveHeight(parseFloat(e.target.value))}
                      className="mt-2 w-full accent-sky-200"
                    />
                  </div>

                  <div className="rounded-xl px-2 py-2 hover:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="light" className="text-sm text-white/90">
                        Lighting (clear → overcast)
                      </label>
                      <span className="text-sm tabular-nums text-white/60">
                        {lighting.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id="light"
                      type="range"
                      min={0.2}
                      max={2.2}
                      step={0.01}
                      value={lighting}
                      onChange={(e) => setLighting(parseFloat(e.target.value))}
                      className="mt-2 w-full accent-sky-200"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/60">
                  <button
                    type="button"
                    onClick={() => {
                      setWindSpeed(8);
                      setWaveHeight(0.9);
                      setLighting(1.1);
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 hover:bg-white/10"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 hover:bg-white/10"
                  >
                    {paused ? 'Resume' : 'Pause'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Intentionally no "how to interact" text overlay; OrbitControls still enabled. */}
    </div>
  );
}
