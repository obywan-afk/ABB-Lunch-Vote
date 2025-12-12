import fs from 'node:fs'
import path from 'node:path'

function ensureFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, contents, 'utf8')
  }
}

const projectRoot = process.cwd()
const nextDir = path.join(projectRoot, '.next')

ensureFile(path.join(nextDir, 'routes-manifest.json'), JSON.stringify({}, null, 2))
ensureFile(
  path.join(nextDir, 'server', 'app-paths-manifest.json'),
  JSON.stringify({}, null, 2),
)

