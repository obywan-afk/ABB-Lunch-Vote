'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTicTacToe } from '@/hooks/useTicTacToe'
import { cn } from '@/lib/utils'

function formatTimeAgo(isoDate?: string | null) {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHrs = Math.floor(diffMin / 60)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHrs < 6) return `${diffHrs} h ago`
  return 'earlier today'
}

export function TicTacToePanel() {
  const {
    matches,
    activeMatch,
    setActiveMatchId,
    cells,
    loading,
    mutating,
    error,
    setError,
    userName,
    joinNewMatch,
    joinExistingMatch,
    makeMove,
    resetMatch,
    abandonMatch,
    refresh,
  } = useTicTacToe()

  const [localUserName, setLocalUserName] = useState<string | null>(userName)
  const [isOpen, setIsOpen] = useState(false)
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

  const myPlayer = useMemo(
    () =>
      activeMatch?.players.find((p) => p.userName === localUserName) || null,
    [activeMatch, localUserName],
  )

  const winningLine = useMemo(
    () =>
      activeMatch?.winningLine
        ? activeMatch.winningLine.split(',').map((v: string) => Number(v))
        : [],
    [activeMatch?.winningLine],
  )

  const isMyTurn =
    activeMatch?.status === 'active' &&
    !!myPlayer &&
    activeMatch.currentTurn === myPlayer.symbol

  const availableSymbolsForNew = useMemo(() => ['X', 'O'], [])

  const myMatches = useMemo(
    () =>
      matches.filter((m) =>
        m.players.some((p) => p.userName === localUserName),
      ),
    [matches, localUserName],
  )

  const myTurnCount = useMemo(
    () =>
      myMatches.filter((m) => {
        const me = m.players.find((p) => p.userName === localUserName)
        if (!me) return false
        return m.status === 'active' && m.currentTurn === me.symbol
      }).length,
    [myMatches, localUserName],
  )

  const waitingForOpponentCount = useMemo(
    () => myMatches.filter((m) => m.status === 'waiting').length,
    [myMatches],
  )

  const handleCellClick = (index: number) => {
    if (!activeMatch || !myPlayer || mutating) return
    if (activeMatch.status !== 'active') return
    if (cells[index] !== '-') return
    if (
      activeMatch.currentTurn &&
      activeMatch.currentTurn !== myPlayer.symbol
    ) {
      return
    }
    void makeMove(index)
  }

  const handleNewMatch = () => {
    void joinNewMatch(availableSymbolsForNew[0] as 'X' | 'O')
    setIsOpen(true)
  }

  const handleJoinMatch = (matchId: string) => {
    void joinExistingMatch(matchId)
    setIsOpen(true)
  }

  const statusCopy = useMemo(() => {
    if (!activeMatch) return 'No game selected'
    if (activeMatch.status === 'waiting') {
      const hasTwoPlayers = activeMatch.players.length >= 2
      return hasTwoPlayers ? 'Ready to start' : 'Waiting for an opponent'
    }
    if (activeMatch.status === 'active') {
      return isMyTurn ? 'Your move' : `${activeMatch.currentTurn} to play`
    }
    if (activeMatch.status === 'abandoned') {
      return 'Game abandoned'
    }
    if (activeMatch.winnerSymbol) {
      return `${activeMatch.winnerSymbol} wins`
    }
    return 'Draw game'
  }, [activeMatch, isMyTurn])

  const headerSummary = useMemo(() => {
    if (!myMatches.length) return 'No games yet today'
    const parts: string[] = []
    if (myTurnCount > 0) parts.push(`${myTurnCount} your turn`)
    if (waitingForOpponentCount > 0)
      parts.push(`${waitingForOpponentCount} waiting`)
    const finishedCount = myMatches.filter((m) => m.status === 'finished').length
    if (finishedCount > 0) parts.push(`${finishedCount} finished`)
    return parts.join(' · ')
  }, [myMatches, myTurnCount, waitingForOpponentCount])

  const renderCollapsed = () => (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/80 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.9)] backdrop-blur"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] font-semibold text-cyan-200">
          XO
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Daily mini-game
          </div>
          <div className="text-xs font-medium text-white">
            Tic-Tac-Toe
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-white/60">
        {headerSummary}
      </div>
    </button>
  )

  const renderMatchStatusPill = (status: string, isYourTurn: boolean) => {
    if (status === 'abandoned') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-200">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          Abandoned
        </span>
      )
    }
    if (isYourTurn) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Your turn
        </span>
      )
    }
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-200">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          In progress
        </span>
      )
    }
    if (status === 'waiting') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Waiting
        </span>
      )
    }
    if (status === 'finished') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-medium text-slate-100">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          Finished
        </span>
      )
    }
    return null
  }

  const renderMatchList = () => {
    if (!matches.length) {
      return (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
          No games yet today. Start a quick round with a teammate.
        </div>
      )
    }

    return (
      <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
        {matches.map((match) => {
          const me = match.players.find((p) => p.userName === localUserName)
          const opponent = match.players.find((p) => p.userName !== localUserName)
          const isSelected = match.id === activeMatch?.id
          const isYourTurn: boolean =
            !!me && match.status === 'active' && match.currentTurn === me.symbol
          const lastMove = match.moves[match.moves.length - 1]
          const lastActivity = lastMove?.createdAt || match.createdAt

          const canJoin =
            !me &&
            match.players.length < 2 &&
            match.status !== 'finished' &&
            match.status !== 'abandoned'

          return (
            <button
              key={match.id}
              type="button"
              onClick={() => setActiveMatchId(match.id)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left transition',
                'border-white/10 bg-white/5 hover:border-cyan-300/60 hover:bg-white/10',
                isSelected && 'border-cyan-300/70 bg-cyan-500/10',
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-white">
                    {me ? me.symbol : '–'}
                  </span>
                  <span className="text-[11px] text-white/60">
                    vs {opponent?.userName || '…'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/50">
                  {renderMatchStatusPill(match.status, isYourTurn)}
                  {lastActivity && (
                    <span className="truncate">
                      Last move {formatTimeAgo(lastActivity as string)}
                    </span>
                  )}
                </div>
              </div>
              {canJoin && (
                <button
                  type="button"
                  className="shrink-0 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-500/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleJoinMatch(match.id)
                  }}
                >
                  Join
                </button>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  const renderBoard = () => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner shadow-black/30">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              activeMatch?.status === 'active'
                ? 'bg-emerald-400'
                : activeMatch?.status === 'waiting'
                  ? 'bg-amber-300'
                  : 'bg-slate-400',
            )}
          />
          <span className="text-xs font-semibold text-white/80">
            {statusCopy}
          </span>
        </div>
        <button
          onClick={() => refresh()}
          className="text-[11px] font-semibold text-white/60 transition hover:text-white"
          disabled={mutating}
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {cells.map((value, index) => {
          const isWinning = winningLine.includes(index)
          const disabled =
            !myPlayer ||
            isBusy ||
            activeMatch?.status !== 'active' ||
            value !== '-' ||
            (activeMatch?.currentTurn &&
              myPlayer &&
              activeMatch.currentTurn !== myPlayer.symbol)
          return (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={!!disabled}
              className={cn(
                'group flex aspect-square items-center justify-center rounded-lg border text-2xl font-black uppercase transition',
                'bg-white/5 border-white/10 text-white/80 shadow-[0_12px_40px_-35px_rgba(0,0,0,0.9)]',
                'hover:-translate-y-0.5 hover:border-cyan-300/60 hover:text-white',
                disabled && 'cursor-not-allowed opacity-70 hover:translate-y-0',
                isWinning &&
                  'border-emerald-300/60 bg-emerald-400/10 text-emerald-100 shadow-[0_12px_40px_-30px_rgba(16,185,129,0.4)]',
              )}
            >
              {value !== '-' ? value : ''}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/60">
        <div className="flex items-center gap-3">
          <div>
            <span className="font-semibold text-white/80">You</span>{' '}
            <span className="text-white/60">
              {myPlayer ? `(${myPlayer.symbol})` : 'not in this game'}
            </span>
          </div>
          {activeMatch && (
            <span className="text-white/50">
              {activeMatch.players.length}/2 players
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {myPlayer && activeMatch && activeMatch.status === 'finished' && (
            <button
              onClick={() => void resetMatch()}
              disabled={mutating}
              className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white hover:border-cyan-300/60 hover:bg-white/10"
            >
              Rematch
            </button>
          )}
          {myPlayer && activeMatch &&
            activeMatch.status !== 'finished' &&
            activeMatch.status !== 'abandoned' && (
              <button
                onClick={() => void abandonMatch()}
                disabled={mutating}
                className="rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-100 hover:border-red-300/70 hover:bg-red-500/20"
              >
                Leave game
              </button>
            )}
        </div>
      </div>
    </div>
  )

  return (
    <section className="mt-8">
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2 shadow-[0_24px_80px_-50px_rgba(0,0,0,0.9)] backdrop-blur">
        {!isOpen ? (
          renderCollapsed()
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Daily mini-game
                </p>
                <h2 className="text-base font-bold text-white">
                  Quick Tic-Tac-Toe
                </h2>
                <p className="mt-0.5 text-[11px] text-white/60">
                  Play short rounds with teammates. Start as many games as you like
                  each day.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-[11px] text-white/60">
                {activeMatch?.dateKey && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-semibold uppercase tracking-[0.12em]">
                    {activeMatch.dateKey}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] text-white/50 hover:text-white/80"
                >
                  Collapse
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
              {renderBoard()}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white/80">
                    Your games today
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleNewMatch}
                      disabled={mutating}
                      className="rounded-full bg-cyan-500/80 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_12px_40px_-28px_rgba(34,211,238,0.9)] hover:bg-cyan-400 disabled:opacity-60"
                    >
                      New game
                    </button>
                  </div>
                </div>
                {renderMatchList()}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-100 underline decoration-dotted underline-offset-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
