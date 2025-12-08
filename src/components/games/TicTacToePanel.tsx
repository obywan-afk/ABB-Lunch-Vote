'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTicTacToe } from '@/hooks/useTicTacToe'
import { cn } from '@/lib/utils'

export function TicTacToePanel() {
  const {
    match,
    cells,
    loading,
    mutating,
    error,
    setError,
    userName,
    joinGame,
    makeMove,
    resetMatch,
    refresh,
  } = useTicTacToe()

  const [localUserName, setLocalUserName] = useState<string | null>(userName)
  const isBusy = loading || mutating

  useEffect(() => {
    if (userName) {
      setLocalUserName(userName)
      return
    }
    if (typeof window !== 'undefined') {
      setLocalUserName(sessionStorage.getItem('abb-lunch-vote-user'))
    }
  }, [userName])

  const winningLine = useMemo(
    () =>
      match?.winningLine
        ? match.winningLine.split(',').map((v: string) => Number(v))
        : [],
    [match?.winningLine],
  )

  const myPlayer = useMemo(
    () => match?.players.find((p) => p.userName === localUserName),
    [localUserName, match?.players],
  )

  const availableSymbols = useMemo(() => {
    if (!match) return ['X', 'O']
    const taken = match.players.map((p) => p.symbol)
    return ['X', 'O'].filter((sym) => !taken.includes(sym))
  }, [match])

  const isMyTurn =
    match?.status === 'active' &&
    !!myPlayer &&
    match.currentTurn === myPlayer.symbol

  const statusCopy = useMemo(() => {
    if (!match) return 'Loading game...'
    if (match.status === 'waiting') {
      return 'Waiting for players to join'
    }
    if (match.status === 'active') {
      return isMyTurn
        ? 'Your move—drop a mark'
        : `${match.currentTurn} to play`
    }
    if (match.winnerSymbol) {
      return `${match.winnerSymbol} wins`
    }
    return 'Draw game'
  }, [isMyTurn, match])

  const handleCellClick = (index: number) => {
    if (!match || !myPlayer || mutating) return
    if (match.status !== 'active') return
    if (cells[index] !== '-') return
    if (match.currentTurn && match.currentTurn !== myPlayer.symbol) return
    makeMove(index)
  }

  return (
    <section className="mt-12">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_-70px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="absolute right-20 top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute left-10 bottom-10 h-28 w-28 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Daily mini-game
                </p>
                <h2 className="text-2xl font-black text-white md:text-3xl">
                  Tic Tac Toe — live, persistent
                </h2>
                <p className="text-sm text-white/70">
                  Play a fast round with teammates. State lives in the database,
                  so moves sync across laptops.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.16em] text-white/70 shadow-inner shadow-black/30">
                {match?.dateKey || '---'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      match?.status === 'active'
                        ? 'bg-emerald-400'
                        : 'bg-amber-300',
                    )}
                  />
                  <span className="text-sm font-semibold text-white/80">
                    {statusCopy}
                  </span>
                </div>
                <button
                  onClick={() => refresh()}
                  className="text-xs font-semibold text-white/70 transition hover:text-white"
                  disabled={mutating}
                >
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {cells.map((value, index) => {
                  const isWinning = winningLine.includes(index)
                  const disabled =
                    !myPlayer ||
                    isBusy ||
                    match?.status !== 'active' ||
                    value !== '-' ||
                    (match?.currentTurn &&
                      myPlayer &&
                      match.currentTurn !== myPlayer.symbol)
                  return (
                    <button
                      key={index}
                      onClick={() => handleCellClick(index)}
                      disabled={disabled}
                      className={cn(
                        'group flex aspect-square items-center justify-center rounded-xl border text-3xl font-black uppercase transition',
                        'bg-white/5 border-white/10 text-white/80 shadow-[0_15px_60px_-50px_rgba(0,0,0,0.8)]',
                        'hover:-translate-y-0.5 hover:border-cyan-300/60 hover:text-white',
                      disabled && 'cursor-not-allowed opacity-70 hover:translate-y-0',
                        isWinning &&
                          'border-emerald-300/60 bg-emerald-400/10 text-emerald-100 shadow-[0_15px_60px_-40px_rgba(16,185,129,0.4)]',
                      )}
                    >
                      {value !== '-' ? value : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/80">
                  Players
                </span>
                {match?.status === 'finished' && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                    {match.winnerSymbol ? `${match.winnerSymbol} wins` : 'Draw'}
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {['X', 'O'].map((symbol) => {
                  const player = match?.players.find(
                    (p) => p.symbol === symbol,
                  )
                  const isYou = player && player.userName === localUserName
                  return (
                    <div
                      key={symbol}
                      className={cn(
                        'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm shadow-[0_10px_40px_-35px_rgba(0,0,0,0.8)]',
                        isYou && 'border-cyan-300/60 bg-cyan-400/10 text-white',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          {symbol} {isYou ? '(you)' : ''}
                        </span>
                        <span className="text-xs text-white/60">
                          {player?.userName || 'Waiting...'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {!myPlayer && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => joinGame(availableSymbols[0] as 'X' | 'O')}
                    disabled={mutating || availableSymbols.length === 0}
                    className={cn(
                      'w-full rounded-xl border px-4 py-2 text-sm font-semibold transition',
                      availableSymbols.length === 0
                        ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/40'
                        : 'border-cyan-400/70 bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow-[0_20px_60px_-40px_rgba(59,130,246,0.6)] hover:from-indigo-400 hover:to-cyan-300',
                    )}
                  >
                    {availableSymbols.length === 0
                      ? 'Match full'
                      : `Join as ${availableSymbols[0]}`}
                  </button>
                </div>
              )}

              {myPlayer && match?.status === 'finished' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => resetMatch()}
                    disabled={mutating}
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/60 hover:bg-white/15"
                  >
                    Start a rematch
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white/80">
                  Activity
                </span>
                <span className="text-xs text-white/60">
                  {match?.moves.length || 0} moves
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {match?.moves.length ? (
                  match.moves.map((move) => {
                    const player =
                      match.players.find((p) => p.id === move.playerId) || null
                    return (
                      <div
                        key={move.id}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-white/80"
                      >
                        <span>
                          <span className="font-semibold">{move.symbol}</span>{' '}
                          → cell {move.position + 1}
                        </span>
                        <span className="text-xs text-white/60">
                          {player?.userName || 'Player'}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-white/60">
                    No moves yet. Claim your symbol and start.
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-50">
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-100 underline decoration-dotted underline-offset-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
