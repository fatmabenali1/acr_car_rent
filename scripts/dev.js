const { spawn } = require('node:child_process')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const projects = [
  path.join(root, 'backend'),
  path.join(root, 'frontend', 'mon-projet-react'),
]
const children = projects.map((cwd) => spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'dev'],
  { cwd, stdio: 'inherit', shell: process.platform === 'win32' },
))
let shuttingDown = false

function shutdown(code) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (child.exitCode === null) child.kill()
  }
  process.exitCode = code
}

for (const child of children) {
  child.on('error', (error) => {
    console.error('Unable to start a development server:', error.message)
    shutdown(1)
  })
  child.on('exit', (code) => {
    if (code && !shuttingDown) shutdown(code)
  })
}

process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))
