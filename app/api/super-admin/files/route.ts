import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { ADMIN_ROLES, type UserRole } from '@/lib/permissions'
import fs from 'fs/promises'
import path from 'path'

function getSafePath(relativePath: string) {
  const root = process.cwd()
  // Resolve path to handle relative jumps (like ../)
  const absolutePath = path.resolve(root, relativePath || '.')
  // Ensure it starts with process.cwd() directory to prevent traversal outside of the repo
  if (!absolutePath.startsWith(root)) {
    return null
  }
  return absolutePath
}

const EXCLUDED_NAMES = [
  'node_modules',
  '.git',
  '.next',
  '.vercel',
  'dist',
  'package-lock.json',
  '.DS_Store'
]

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const relPath = searchParams.get('path') || '.'

    const safePath = getSafePath(relPath)
    if (!safePath) {
      return NextResponse.json({ success: false, error: 'Invalid or restricted path' }, { status: 400 })
    }

    try {
      const stats = await fs.stat(safePath)
      if (stats.isDirectory()) {
        const dirents = await fs.readdir(safePath, { withFileTypes: true })
        const files = dirents
          .filter(dirent => !EXCLUDED_NAMES.includes(dirent.name))
          .map(dirent => {
            const relativeItemPath = path.relative(process.cwd(), path.join(safePath, dirent.name)).replace(/\\/g, '/')
            return {
              name: dirent.name,
              isDirectory: dirent.isDirectory(),
              path: relativeItemPath
            }
          })
          // Sort folders first, then files
          .sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1
            if (!a.isDirectory && b.isDirectory) return 1
            return a.name.localeCompare(b.name)
          })

        return NextResponse.json({
          success: true,
          isDirectory: true,
          files
        })
      } else {
        const content = await fs.readFile(safePath, 'utf-8')
        return NextResponse.json({
          success: true,
          isDirectory: false,
          content
        })
      }
    } catch (err: any) {
      return NextResponse.json({ success: false, error: `Path error: ${err.message}` }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Super Admin File GET Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, path: relPath, content, isFolder } = body

    if (!action || !relPath) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }

    const safePath = getSafePath(relPath)
    if (!safePath) {
      return NextResponse.json({ success: false, error: 'Invalid or restricted path' }, { status: 400 })
    }

    // Exclude restricted names
    const basename = path.basename(safePath)
    if (EXCLUDED_NAMES.includes(basename)) {
      return NextResponse.json({ success: false, error: 'Restricted system file or directory' }, { status: 403 })
    }

    try {
      if (action === 'write') {
        if (typeof content !== 'string') {
          return NextResponse.json({ success: false, error: 'Content must be a string' }, { status: 400 })
        }
        await fs.writeFile(safePath, content, 'utf-8')
        return NextResponse.json({ success: true, message: `File ${relPath} saved successfully` })
      } else if (action === 'create') {
        if (isFolder) {
          await fs.mkdir(safePath, { recursive: true })
          return NextResponse.json({ success: true, message: `Folder ${relPath} created successfully` })
        } else {
          // Write empty file
          await fs.writeFile(safePath, '', 'utf-8')
          return NextResponse.json({ success: true, message: `File ${relPath} created successfully` })
        }
      } else if (action === 'delete') {
        const stats = await fs.stat(safePath)
        if (stats.isDirectory()) {
          await fs.rm(safePath, { recursive: true, force: true })
          return NextResponse.json({ success: true, message: `Folder ${relPath} deleted successfully` })
        } else {
          await fs.unlink(safePath)
          return NextResponse.json({ success: true, message: `File ${relPath} deleted successfully` })
        }
      } else {
        return NextResponse.json({ success: false, error: 'Invalid action type' }, { status: 400 })
      }
    } catch (err: any) {
      return NextResponse.json({ success: false, error: `Operation failed: ${err.message}` }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Super Admin File POST Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
