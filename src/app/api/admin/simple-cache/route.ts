import { NextRequest, NextResponse } from 'next/server'
import { DbMenuCache } from '@/lib/dbMenuCache'
import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const cacheDir = path.join(process.cwd(), '.cache', 'menus')
    
    if (!existsSync(cacheDir)) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      })
    }

    const files = await readdir(cacheDir)
    const cacheInfo = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(cacheDir, file)
        const stats = await stat(filePath)
        return {
          filename: file,
          size: stats.size,
          modified: stats.mtime.toISOString()
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: cacheInfo,
      count: cacheInfo.length
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get cache status' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '0')
  
  try {
    if (days > 0) {
      await DbMenuCache.cleanOldCache(days)
    } else {
      // Clear all cache
      const cacheDir = path.join(process.cwd(), '.cache', 'menus')
      if (existsSync(cacheDir)) {
        const { readdir, unlink } = await import('fs/promises')
        const files = await readdir(cacheDir)
        await Promise.all(
          files.map(file => unlink(path.join(cacheDir, file)))
        )
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}