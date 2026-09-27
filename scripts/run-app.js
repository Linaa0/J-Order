const { spawn, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const envLocalPath = path.join(projectRoot, '.env.local')
const dockerComposePath = path.join(projectRoot, 'docker-compose.yml')

function ensureDockerComposeExists() {
  if (!fs.existsSync(dockerComposePath)) {
    throw new Error('Missing docker-compose.yml in project root.')
  }
}

function run(command, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      cwd: projectRoot,
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} exited with code ${code}`))
      }
    })

    child.on('error', reject)
  })
}

async function main() {
  ensureDockerComposeExists()

  const mode = process.argv.includes('--db-only') ? 'db-only' : 'full'

  try {
    if (mode === 'full') {
      console.log('Starting PostgreSQL and preparing Prisma...')
      await run('docker compose up -d db')
      await run('npx prisma generate')
      await run('npx prisma migrate deploy')
      console.log('Starting Next.js app...')
      await run('npm run dev')
      return
    }

    console.log('Starting PostgreSQL and preparing Prisma...')
    await run('docker compose up -d db')
    await run('npx prisma generate')
    await run('npx prisma migrate deploy')
    console.log('Database setup complete. Run "npm run dev" to start the app.')
  } catch (error) {
    console.error('\nStartup failed:')
    console.error(error.message)
    process.exit(1)
  }
}

main()
