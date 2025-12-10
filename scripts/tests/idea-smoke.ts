import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET as menusGet } from '@/app/api/menus/route'
import {
  GET as ticTacToeGet,
  POST as ticTacToePost,
  PATCH as ticTacToePatch,
} from '@/app/api/games/tictactoe/route'

type MenuResponse = {
  success: boolean
  restaurants: Array<{
    id: string
    name: string
    parsedMenu?: string | null
    rawMenu?: string | null
    location?: string | null
  }>
}

type TicTacToeResponse = {
  match?: {
    id: string
    board: string
    status: string
    players: Array<{ userName: string | null; symbol: 'X' | 'O' }>
  }
  matches?: Array<{ id: string }>
  error?: string
}

function buildNextRequest(path: string) {
  const url = new URL(`https://internal.test${path}`)
  return new NextRequest(url)
}

async function expectJson<T>(response: Response, label: string) {
  const body = await response.text()
  if (response.ok) {
    return JSON.parse(body) as T
  }
  throw new Error(`${label} failed (${response.status}): ${body}`)
}

async function runMenuIdeaTests() {
  const days = ['tuesday', 'wednesday', 'thursday']
  for (const day of days) {
    const request = buildNextRequest(`/api/menus?language=en&day=${day}`)
    const response = await menusGet(request)
    const data = await expectJson<MenuResponse>(response, `menus:${day}`)

    assert.equal(data.success, true, `Menu fetch for ${day} did not succeed`)
    assert.ok(
      Array.isArray(data.restaurants) && data.restaurants.length > 0,
      `Menu fetch for ${day} returned no restaurants`,
    )

    data.restaurants.forEach((restaurant) => {
      assert.ok(
        typeof restaurant.name === 'string' && restaurant.name.length > 0,
        `Restaurant missing name on ${day}`,
      )
      assert.ok(
        restaurant.parsedMenu || restaurant.rawMenu,
        `Restaurant ${restaurant.name} lacks menu text on ${day}`,
      )
    })
  }
  console.log('✅ Menu idea tests passed')
}

async function runTicTacToeIdeaTests() {
  const listings = await ticTacToeGet()
  const listingData = await expectJson<TicTacToeResponse>(
    listings,
    'ticTacToe:list',
  )
  assert.ok(
    Array.isArray(listingData.matches),
    'TicTacToe listing should return matches array',
  )

  const baseUser = `TestRunner_${Date.now()}`
  const userA = `${baseUser}_A`
  const userB = `${baseUser}_B`

  const createRequest = new Request(
    'https://internal.test/api/games/tictactoe',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': userA,
      },
      body: JSON.stringify({ preferredSymbol: 'X' }),
    },
  )
  const createResponse = await ticTacToePost(createRequest)
  const createData = await expectJson<TicTacToeResponse>(
    createResponse,
    'ticTacToe:create',
  )
  assert.ok(createData.match, 'Expected match payload when creating game')
  const matchId = createData.match!.id
  assert.equal(createData.match!.players.length, 1, 'New match should have 1 player')

  const joinRequest = new Request(
    'https://internal.test/api/games/tictactoe',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': userB,
      },
      body: JSON.stringify({ matchId, preferredSymbol: 'O' }),
    },
  )
  const joinResponse = await ticTacToePost(joinRequest)
  const joinData = await expectJson<TicTacToeResponse>(
    joinResponse,
    'ticTacToe:join',
  )
  assert.ok(joinData.match, 'Expected match payload when joining game')
  assert.equal(
    joinData.match!.players.length,
    2,
    'Match should have two players after join',
  )

  const moveRequest = new Request(
    'https://internal.test/api/games/tictactoe',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': userA,
      },
      body: JSON.stringify({ matchId, action: 'move', position: 0 }),
    },
  )
  const moveResponse = await ticTacToePatch(moveRequest)
  const moveData = await expectJson<TicTacToeResponse>(
    moveResponse,
    'ticTacToe:move',
  )
  assert.ok(moveData.match, 'Expected match payload after making move')
  assert.notEqual(
    moveData.match!.board[0],
    '-',
    'First cell should be occupied after player move',
  )

  const opponentMoveRequest = new Request(
    'https://internal.test/api/games/tictactoe',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': userB,
      },
      body: JSON.stringify({ matchId, action: 'move', position: 1 }),
    },
  )
  const opponentMoveResponse = await ticTacToePatch(opponentMoveRequest)
  const opponentMoveData = await expectJson<TicTacToeResponse>(
    opponentMoveResponse,
    'ticTacToe:opponentMove',
  )
  assert.ok(opponentMoveData.match, 'Opponent move should return match payload')
  assert.notEqual(
    opponentMoveData.match!.board[1],
    '-',
    'Second cell should be occupied after opponent move',
  )

  const abandonRequest = new Request(
    'https://internal.test/api/games/tictactoe',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': userA,
      },
      body: JSON.stringify({ matchId, action: 'abandon' }),
    },
  )
  const abandonResponse = await ticTacToePatch(abandonRequest)
  const abandonData = await expectJson<TicTacToeResponse>(
    abandonResponse,
    'ticTacToe:abandon',
  )
  assert.equal(
    abandonData.match?.status,
    'abandoned',
    'Match should be abandoned after cleanup',
  )
  console.log('✅ Tic-Tac-Toe idea tests passed')
}

async function main() {
  await runMenuIdeaTests()
  await runTicTacToeIdeaTests()
  console.log('🎉 Idea smoke tests completed successfully')
}

main().catch((error) => {
  console.error('❌ Idea smoke tests failed')
  console.error(error)
  process.exit(1)
})
