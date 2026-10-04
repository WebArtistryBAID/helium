import { spawn } from 'node:child_process'

const port = process.env.NEXT_PORT ?? '52323'
const nextBin = new URL('../node_modules/next/dist/bin/next', import.meta.url)
const child = spawn(process.execPath, [ nextBin.pathname, 'start', '--port', port ], {
    stdio: 'inherit'
})

for (const signal of [ 'SIGINT', 'SIGTERM' ]) {
    process.once(signal, () => child.kill(signal))
}

child.once('exit', (code, signal) => {
    if (signal != null) process.kill(process.pid, signal)
    else process.exit(code ?? 1)
})
