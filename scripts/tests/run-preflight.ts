import { spawn } from 'node:child_process'

type Task = {
  name: string
  command: string
  args: string[]
}

const TASKS: Task[] = [
  { name: 'Lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'Type check', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'Idea smoke tests', command: 'npm', args: ['run', 'test:idea'] },
]

function runTask(task: Task) {
  return new Promise<void>((resolve, reject) => {
    console.log(`\n▶️  ${task.name}`)
    const child = spawn(task.command, task.args, {
      stdio: 'inherit',
      env: process.env,
    })

    child.on('error', (error) => {
      reject(
        new Error(
          `${task.name} failed to start (${task.command}): ${error.message}`,
        ),
      )
    })

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${task.name} passed`)
        resolve()
      } else {
        reject(new Error(`${task.name} failed with exit code ${code}`))
      }
    })
  })
}

async function main() {
  for (const task of TASKS) {
    await runTask(task)
  }
  console.log('\n🎯 All preflight checks passed')
}

main().catch((error) => {
  console.error('\n❌ Preflight checks failed')
  console.error(error)
  process.exit(1)
})
