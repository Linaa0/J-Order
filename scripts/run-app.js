const { spawn, execFileSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const dockerComposePath = path.join(projectRoot, "docker-compose.yml");
const projectPathForPowerShell = projectRoot.replace(/'/g, "''");

function run(command, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      cwd: projectRoot,
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

function isDockerDaemonReady() {
  try {
    execSync("docker info --format '{{.ServerVersion}}'", {
      stdio: "ignore",
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
}

function getWindowsPostgresServices() {
  try {
    const output = execSync(
      "Get-CimInstance Win32_Service | Where-Object { $_.Name -like 'postgresql*' } | Select-Object -ExpandProperty Name",
      { encoding: "utf8", stdio: "pipe", shell: "powershell.exe" },
    );
    return output
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getConfiguredDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = path.join(projectRoot, ".env.local");
  if (fs.existsSync(envPath)) {
    const line = fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));
    const match = line?.match(/^\s*DATABASE_URL\s*=\s*['"]?([^'"]+)['"]?\s*$/);
    if (match) return match[1].trim();
  }

  return "postgresql://jorder:jorderpass@localhost:5432/jorder";
}

function databaseUrlForPort(port) {
  const url = new URL(getConfiguredDatabaseUrl());
  url.port = String(port);
  return url.toString();
}

function runPowerShell(script, options = {}) {
  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    { encoding: "utf8", stdio: "pipe", ...options },
  );
}

function stopProjectDevServers() {
  if (process.platform !== "win32") return;

  const script = `$root='${projectPathForPowerShell}'; $self=${process.pid}; $processes=Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $self -and $_.Name -match '^node(\.exe)?$' -and $_.CommandLine -like "*$root*" -and $_.CommandLine -match 'next|prisma' }; foreach ($process in $processes) { Write-Output "Stopping previous J Order Node process $($process.ProcessId)"; Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }`;
  try {
    const output = runPowerShell(script);
    if (output.trim()) process.stdout.write(output);
  } catch {
    console.warn(
      "Could not inspect old project dev servers; Prisma generation will still retry if a file lock occurs.",
    );
  }
}

function clearNextBuildArtifacts() {
  const nextOutput = path.join(projectRoot, ".next");
  if (fs.existsSync(path.join(nextOutput, "BUILD_ID"))) {
    fs.rmSync(nextOutput, { recursive: true, force: true });
    console.log(
      "Cleared production build output before starting the dev server.",
    );
  }
}

function startNextDev(dbUrl) {
  const nextCli = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextCli, "dev"], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "inherit",
    windowsHide: false,
  });

  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        const exitDetail = signal ? `signal ${signal}` : `exit code ${code}`;
        reject(new Error(`Next.js dev server stopped with ${exitDetail}.`));
      }
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function generatePrismaClient(dbUrl) {
  stopProjectDevServers();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await run("npx prisma generate", { DATABASE_URL: dbUrl });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw new Error(
          `Prisma client generation failed after ${attempt} attempts. Close any J Order dev servers or editor processes locking node_modules\\.prisma\\client. If it persists, temporarily exclude node_modules from real-time antivirus scanning. Original error: ${error.message}`,
        );
      }

      console.warn(
        `Prisma generation attempt ${attempt} failed. Retrying in ${attempt * 2} seconds...`,
      );
      await delay(attempt * 2000);
    }
  }
}

function getLocalPostgresService() {
  const services = getWindowsPostgresServices();
  if (!services.length) return null;

  try {
    const output = runPowerShell(
      `Get-CimInstance Win32_Service | Where-Object { $_.Name -in @(${services.map((name) => `'${name.replace(/'/g, "''")}'`).join(",")}) } | Select-Object -ExpandProperty PathName`,
    );
    const portMatch = output.match(/(?:-p|--port)\s+(\d+)/i);
    return { name: services[0], port: portMatch ? Number(portMatch[1]) : 5432 };
  } catch {
    return { name: services[0], port: 5432 };
  }
}

async function startLocalPostgres(service) {
  console.log(
    `Docker is not running. Using local PostgreSQL service ${service.name} on port ${service.port}.`,
  );
  let status;
  try {
    status = runPowerShell(
      `(Get-Service -Name '${service.name}').Status`,
    ).trim();
  } catch {
    throw new Error(`Could not read local PostgreSQL service ${service.name}.`);
  }

  if (status !== "Running") {
    console.log(
      "Requesting Windows approval to start the local PostgreSQL service...",
    );
    const script = `Start-Service -Name '${service.name}'`;
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    execSync(
      `powershell.exe -NoProfile -Command "Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile -EncodedCommand ${encoded}'"`,
      { stdio: "inherit" },
    );
  }

  const readyCommand = `Test-NetConnection -ComputerName localhost -Port ${service.port} -InformationLevel Quiet`;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if (runPowerShell(readyCommand).trim().endsWith("True")) return;
    } catch {
      // Keep waiting for the service to accept connections.
    }
    await delay(1000);
  }

  throw new Error(
    `Local PostgreSQL did not become ready on port ${service.port}.`,
  );
}

async function setupDatabase() {
  let dbUrl;
  const localService =
    process.platform === "win32" ? getLocalPostgresService() : null;

  if (isDockerDaemonReady() && fs.existsSync(dockerComposePath)) {
    console.log(
      "Docker Desktop is running. Starting PostgreSQL with Docker Compose...",
    );
    await run("docker compose up -d db");
    dbUrl = databaseUrlForPort(5433);
  } else if (localService) {
    await startLocalPostgres(localService);
    dbUrl = databaseUrlForPort(localService.port);
  } else {
    throw new Error(
      "Docker is not running and no local PostgreSQL service was found. Start Docker Desktop, or install PostgreSQL so this runner can use the local service fallback.",
    );
  }

  console.log("Preparing Prisma database...");
  await generatePrismaClient(dbUrl);
  await run("npx prisma migrate deploy", { DATABASE_URL: dbUrl });
  return dbUrl;
}

async function main() {
  const mode = process.argv.includes("--db-only") ? "db-only" : "full";

  try {
    const dbUrl = await setupDatabase();

    if (mode === "full") {
      stopProjectDevServers();
      clearNextBuildArtifacts();
      console.log(
        "Starting Next.js directly (without the npm shell wrapper)...",
      );
      await startNextDev(dbUrl);
      return;
    }

    console.log('Database setup complete. Run "npm run dev" to start the app.');
  } catch (error) {
    console.error("\nStartup failed:");
    console.error(error.message);
    process.exit(1);
  }
}

main();
