import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentDate } from '@/lib/time/week'

const EMPTY_BOARD = '---------'
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function evaluateBoard(board: string) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    if (board[a] !== '-' && board[a] === board[b] && board[a] === board[c]) {
      return { winnerSymbol: board[a], winningLine: line }
    }
  }
  return null
}

async function ensureUser(userName: string) {
  let user = await prisma.user.findFirst({
    where: { name: userName },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: userName,
        sessionId: `session_${userName}_${Date.now()}`,
      },
    })
  }

  return user
}

async function loadMatch(matchId?: string, dateKey?: string) {
  return prisma.ticTacToeMatch.findFirst({
    where: matchId
      ? { id: matchId }
      : {
          dateKey: dateKey || getCurrentDate(),
        },
    orderBy: { createdAt: 'desc' },
    include: {
      players: true,
      moves: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

async function getOrCreateDailyMatch() {
  const dateKey = getCurrentDate()
  let match = await loadMatch(undefined, dateKey)

  if (!match) {
    match = await prisma.ticTacToeMatch.create({
      data: {
        dateKey,
        board: EMPTY_BOARD,
        status: 'waiting',
        currentTurn: 'X',
      },
      include: {
        players: true,
        moves: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  return match
}

function serializeMatch(match: any) {
  return {
    id: match.id,
    dateKey: match.dateKey,
    board: match.board,
    currentTurn: match.currentTurn,
    status: match.status,
    winnerSymbol: match.winnerSymbol,
    winnerName: match.winnerName,
    winningLine: match.winningLine,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
    players: match.players.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      userName: p.userName,
      symbol: p.symbol,
      joinedAt: p.joinedAt,
    })),
    moves: match.moves.map((m: any) => ({
      id: m.id,
      position: m.position,
      symbol: m.symbol,
      playerId: m.playerId,
      createdAt: m.createdAt,
    })),
  }
}

export async function GET() {
  try {
    const match = await getOrCreateDailyMatch()
    return NextResponse.json({ match: serializeMatch(match) })
  } catch (error) {
    console.error('Error fetching tic tac toe match:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tic tac toe match' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const userName = request.headers.get('x-user-name')
    if (!userName) {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const preferredSymbol = body?.preferredSymbol as 'X' | 'O' | undefined

    const [match, user] = await Promise.all([
      getOrCreateDailyMatch(),
      ensureUser(userName),
    ])

    const existingPlayer = match.players.find(
      (p: any) => p.userId === user.id,
    )
    if (existingPlayer) {
      return NextResponse.json({ match: serializeMatch(match) })
    }

    if (match.players.length >= 2) {
      return NextResponse.json(
        { error: 'Match already has two players' },
        { status: 409 },
      )
    }

    const takenSymbols = match.players.map((p: any) => p.symbol)
    const availableSymbols = ['X', 'O'].filter(
      (sym) => !takenSymbols.includes(sym),
    )
    const symbol =
      preferredSymbol && availableSymbols.includes(preferredSymbol)
        ? preferredSymbol
        : availableSymbols[0] || 'X'

    const nextStatus =
      match.players.length + 1 >= 2 ? 'active' : ('waiting' as const)

    const updated = await prisma.ticTacToeMatch.update({
      where: { id: match.id },
      data: {
        status: nextStatus,
        currentTurn: match.currentTurn || 'X',
        players: {
          create: {
            userId: user.id,
            userName: user.name || userName,
            symbol,
          },
        },
      },
      include: {
        players: true,
        moves: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ match: serializeMatch(updated) })
  } catch (error) {
    console.error('Error joining tic tac toe match:', error)
    return NextResponse.json(
      { error: 'Failed to join match' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const userName = request.headers.get('x-user-name')
    if (!userName) {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { action = 'move', position, matchId } = body

    const user = await ensureUser(userName)
    const match =
      (await loadMatch(matchId)) || (await getOrCreateDailyMatch())

    const player = match.players.find((p: any) => p.userId === user.id)
    if (!player) {
      return NextResponse.json(
        { error: 'Join the match before making a move' },
        { status: 403 },
      )
    }

    if (action === 'reset') {
      if (match.status !== 'finished') {
        return NextResponse.json(
          { error: 'Match is not finished yet' },
          { status: 400 },
        )
      }

      await prisma.ticTacToeMove.deleteMany({
        where: { matchId: match.id },
      })

      const reset = await prisma.ticTacToeMatch.update({
        where: { id: match.id },
        data: {
          board: EMPTY_BOARD,
          currentTurn: 'X',
          status: match.players.length >= 2 ? 'active' : 'waiting',
          winnerName: null,
          winnerSymbol: null,
          winningLine: null,
        },
        include: {
          players: true,
          moves: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      return NextResponse.json({ match: serializeMatch(reset) })
    }

    if (!Number.isInteger(position) || position < 0 || position > 8) {
      return NextResponse.json(
        { error: 'Position must be between 0 and 8' },
        { status: 400 },
      )
    }

    if (match.status !== 'active') {
      return NextResponse.json(
        { error: 'Match is not active' },
        { status: 400 },
      )
    }

    if (match.currentTurn && match.currentTurn !== player.symbol) {
      return NextResponse.json(
        { error: 'Not your turn' },
        { status: 409 },
      )
    }

    const boardArray = match.board.split('')
    if (boardArray[position] !== '-') {
      return NextResponse.json(
        { error: 'Cell already taken' },
        { status: 409 },
      )
    }

    boardArray[position] = player.symbol
    const evaluation = evaluateBoard(boardArray.join(''))
    const hasSpotsLeft = boardArray.includes('-')

    const status = evaluation ? 'finished' : hasSpotsLeft ? 'active' : 'finished'
    const nextTurn = status === 'active' ? (player.symbol === 'X' ? 'O' : 'X') : null

    const updated = await prisma.ticTacToeMatch.update({
      where: { id: match.id },
      data: {
        board: boardArray.join(''),
        status,
        currentTurn: nextTurn,
        winnerSymbol: evaluation ? evaluation.winnerSymbol : null,
        winnerName: evaluation ? player.userName || userName : null,
        winningLine: evaluation ? evaluation.winningLine.join(',') : null,
        moves: {
          create: {
            position,
            symbol: player.symbol,
            playerId: player.id,
          },
        },
      },
      include: {
        players: true,
        moves: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ match: serializeMatch(updated) })
  } catch (error) {
    console.error('Error updating tic tac toe match:', error)
    return NextResponse.json(
      { error: 'Failed to update match' },
      { status: 500 },
    )
  }
}
