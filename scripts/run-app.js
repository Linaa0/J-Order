const { spawn, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const dockerComposePath = path.join(projectRoot, 'docker-compose.yml')

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

function hasDocker() {
  try {
    execSync('docker --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function hasWindowsLocalPostgresService() {
  const serviceName = 'postgresql-x64-18'
  try {
    const output = execSync(`Get-Service -Name ${serviceName} -ErrorAction SilentlyContinue`, { stdio: 'pipe', shell: 'powershell.exe' })
    return output && output.toString().includes(serviceName)
  } catch {
    return false
  }
}

function ensureDockerComposeExists() {
  if (hasDocker()) {
    return
  }

  if (!fs.existsSync(dockerComposePath)) {
    console.warn('No Docker Compose file found. The app can still run with a local PostgreSQL installation.')
  }
}

async function startWindowsPostgresService() {
  const serviceName = 'postgresql-x64-18'
  try {
    execSync(`Start-Service -Name ${serviceName}`, { shell: 'powershell.exe', stdio: 'inherit' })
    return true
  } catch (error) {
    console.error(`\nLocal PostgreSQL is installed but needs administrator rights to start.`)
    console.error('Open PowerShell as Administrator and run:')
    console.error(`  Start-Service -Name ${serviceName}`)
    console.error('Then rerun:')
    console.error('  npm run app:run')
    return false
  }
}

async function setupDatabase() {
  if (hasDocker()) {
    console.log('Docker detected. Starting PostgreSQL via Docker...')
    try {
      await run('docker compose up -d db')
    } catch (error) {
      console.error('\nDocker startup failed. Trying the local PostgreSQL service fallback...')
      if (!(await startWindowsPostgresService())) {
        throw new Error('No PostgreSQL startup path is available on this machine. Install Docker Desktop or start PostgreSQL as Administrator.')
      }
    }
  } else if (hasWindowsLocalPostgresService()) {
    console.log('Local PostgreSQL service detected. Starting it...')
    if (!(await startWindowsPostgresService())) {
      throw new Error('PostgreSQL service could not be started without administrator rights.')
    }
  } else {
    throw new Error('Neither Docker nor a local PostgreSQL service is available. Install Docker Desktop or PostgreSQL 18 on this machine.')
  }

  console.log('Preparing Prisma database...')
  await run('npx prisma generate')
  await run('npx prisma migrate deploy')
}

async function main() {
  const mode = process.argv.includes('--db-only') ? 'db-only' : 'full'

  try {
    ensureDockerComposeExists()
    await setupDatabase()

    if (mode === 'full') {
      console.log('Starting Next.js app...')
      await run('npm run dev')
      return
    }

    console.log('Database setup complete. Run "npm run dev" to start the app.')
  } catch (error) {
    console.error('\nStartup failed:')
    console.error(error.message)
    process.exit(1)
  }
}

main()
