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

function OceanControlsPanel({
  windSpeed,
  waveHeight,
  lighting,
  onWindSpeedChange,
  onWaveHeightChange,
  onLightingChange,
  onReset,
}: {
  windSpeed: number;
  waveHeight: number;
  lighting: number;
  onWindSpeedChange: (value: number) => void;
  onWaveHeightChange: (value: number) => void;
  onLightingChange: (value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 rounded-[22px] border border-white/10 bg-[#08141b]/58 px-4 py-4 shadow-[0_22px_70px_rgba(0,0,0,.38)] backdrop-blur-xl">
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/6 bg-white/[0.035] px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="wind" className="text-sm font-medium text-white/92">
              Wind
            </label>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs tabular-nums text-white/72">
              {windSpeed.toFixed(1)}
            </span>
          </div>
          <input
            id="wind"
            type="range"
            min={0}
            max={18}
            step={0.1}
            value={windSpeed}
            onChange={(e) => onWindSpeedChange(parseFloat(e.target.value))}
            className="w-full accent-[#d9f6ff]"
          />
        </div>

        <div className="rounded-2xl border border-white/6 bg-white/[0.035] px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="height" className="text-sm font-medium text-white/92">
              Sea
            </label>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs tabular-nums text-white/72">
              {waveHeight.toFixed(2)}
            </span>
          </div>
          <input
            id="height"
            type="range"
            min={0.2}
            max={2.2}
            step={0.01}
            value={waveHeight}
            onChange={(e) => onWaveHeightChange(parseFloat(e.target.value))}
            className="w-full accent-[#d9f6ff]"
          />
        </div>

        <div className="rounded-2xl border border-white/6 bg-white/[0.035] px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="light" className="text-sm font-medium text-white/92">
              Light
            </label>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs tabular-nums text-white/72">
              {lighting.toFixed(2)}
            </span>
          </div>
          <input
            id="light"
            type="range"
            min={0.45}
            max={1.8}
            step={0.01}
            value={lighting}
            onChange={(e) => onLightingChange(parseFloat(e.target.value))}
            className="w-full accent-[#ffe0b7]"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/90 hover:bg-white/10"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [windSpeed, setWindSpeed] = useState(8.2);
  const [waveHeight, setWaveHeight] = useState(0.9);
  const [lighting, setLighting] = useState(1.2);
  const [paused, setPaused] = useState(false);
  const [showTweak, setShowTweak] = useState(false);
  const [minimizedLogin, setMinimizedLogin] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const resetOcean = () => {
    setWindSpeed(8.2);
    setWaveHeight(0.9);
    setLighting(1.2);
  };

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

    void prefetch(day, 'en');
    void prefetch(day, 'fi');
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

        sessionStorage.setItem('abb-lunch-vote-auth', 'true');
        sessionStorage.setItem('abb-lunch-vote-user', name.trim());

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
    <div className="relative min-h-screen overflow-hidden font-sans antialiased text-white">
      <div className="fixed inset-0 z-0">
        <ThreeGridBackground
          windSpeed={windSpeed}
          waveHeight={waveHeight}
          lighting={lighting}
          paused={paused}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-black/10" />

      <div className="pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2">
        <div className="rounded-full border border-white/20 bg-slate-950/35 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/80 shadow-[0_18px_60px_rgba(0,0,0,.24)] backdrop-blur-xl">
          Drag To Explore The Horizon
        </div>
      </div>

      {!minimizedLogin ? (
        <div className="pointer-events-none relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="pointer-events-auto w-full max-w-[440px]">
            <div className="rounded-[40px] border border-white/20 bg-white/10 p-1 shadow-2xl backdrop-blur-2xl">
              <div className="rounded-[36px] bg-white/60 p-8 shadow-inner ring-1 ring-white/50 backdrop-blur-md md:p-12">
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

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowTweak((v) => !v)}
                className="rounded-full border border-white/15 bg-[#0a1a22]/45 px-5 py-2.5 text-xs font-medium text-white/90 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-xl hover:bg-[#0a1a22]/60"
              >
                {showTweak ? 'Hide ocean controls' : 'Tune the ocean'}
              </button>
            </div>

            {showTweak ? (
              <OceanControlsPanel
                windSpeed={windSpeed}
                waveHeight={waveHeight}
                lighting={lighting}
                onWindSpeedChange={setWindSpeed}
                onWaveHeightChange={setWaveHeight}
                onLightingChange={setLighting}
                onReset={resetOcean}
              />
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
                {showTweak ? 'Hide ocean controls' : 'Tune the ocean'}
              </button>
            </div>

            {showTweak ? (
              <OceanControlsPanel
                windSpeed={windSpeed}
                waveHeight={waveHeight}
                lighting={lighting}
                onWindSpeedChange={setWindSpeed}
                onWaveHeightChange={setWaveHeight}
                onLightingChange={setLighting}
                onReset={resetOcean}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
