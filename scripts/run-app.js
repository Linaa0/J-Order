const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const dockerComposePath = path.join(projectRoot, "docker-compose.yml");
const postgresService = "postgresql-x64-18";
const postgresBin = "C:\\Program Files\\PostgreSQL\\18\\bin";

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

function hasDocker() {
  try {
    execSync("docker --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hasWindowsLocalPostgresService() {
  try {
    const output = execSync(
      `Get-Service -Name ${postgresService} -ErrorAction SilentlyContinue`,
      { stdio: "pipe", shell: "powershell.exe" },
    );
    return output && output.toString().includes(postgresService);
  } catch {
    return false;
  }
}

function databaseUrl(port) {
  const url =
    process.env.DATABASE_URL ||
    "postgresql://jorder:jorderpass@localhost:5432/jorder";
  return url.replace(/:\/\/([^/:]+)(?::\d+)?\//, `://$1:${port}/`);
}

function isDatabaseReady(port) {
  const pgIsReady = path.join(postgresBin, "pg_isready.exe");
  try {
    execSync(`"${pgIsReady}" -h localhost -p ${port}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function startWindowsPostgresService() {
  let status = "";
  try {
    status = execSync(`(Get-Service -Name ${postgresService}).Status`, {
      encoding: "utf8",
      shell: "powershell.exe",
      stdio: "pipe",
    }).trim();
  } catch {
    throw new Error(
      `Could not find the PostgreSQL service ${postgresService}.`,
    );
  }

  if (status !== "Running") {
    console.log("Requesting Windows approval to start PostgreSQL...");
    const command = `Start-Service -Name '${postgresService}'`;
    const escaped = command.replace(/'/g, "''");
    execSync(
      `Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile -Command "${escaped}"'`,
      {
        shell: "powershell.exe",
        stdio: "inherit",
      },
    );
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (isDatabaseReady(5432)) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }

  throw new Error(
    "PostgreSQL service started but did not become ready on port 5432.",
  );
}

async function setupDatabase() {
  let dbUrl = databaseUrl(5432);

  if (hasWindowsLocalPostgresService()) {
    console.log("Using the installed PostgreSQL service...");
    startWindowsPostgresService();
  } else if (hasDocker() && fs.existsSync(dockerComposePath)) {
    console.log("Starting PostgreSQL with Docker...");
    await run("docker compose up -d db");
    dbUrl = databaseUrl(5433);
  } else {
    throw new Error(
      "No local PostgreSQL service or usable Docker setup was found. Install PostgreSQL 18 or Docker Desktop.",
    );
  }

  console.log("Preparing Prisma database...");
  await run("npx prisma generate", { DATABASE_URL: dbUrl });
  await run("npx prisma migrate deploy", { DATABASE_URL: dbUrl });
  return dbUrl;
}

async function main() {
  const mode = process.argv.includes("--db-only") ? "db-only" : "full";

  try {
    const dbUrl = await setupDatabase();

    if (mode === "full") {
      console.log("Starting Next.js app...");
      await run("npm run dev", { DATABASE_URL: dbUrl });
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
