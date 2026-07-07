const path = require("path");

const repoRoot = __dirname;
const logDir = path.join(repoRoot, ".lumiera-logs");
const notebookLmData = path.join(repoRoot, ".notebooklm-data");

module.exports = {
  apps: [
    {
      name: "lumiera-backend",
      cwd: path.join(repoRoot, "dashboard-qanat", "backend"),
      script: "server.js",
      node_args: "--max-old-space-size=4096",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 20,
      min_uptime: "8s",
      restart_delay: 4000,
      max_memory_restart: "3500M",
      kill_timeout: 15000,
      listen_timeout: 120000,
      env: {
        NODE_ENV: "production",
        NOTEBOOKLM_MCP_CLI_PATH: notebookLmData,
      },
      error_file: path.join(logDir, "pm2-backend-error.log"),
      out_file: path.join(logDir, "pm2-backend-out.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "lumiera-frontend",
      cwd: path.join(repoRoot, "dashboard-qanat", "frontend"),
      script: "node_modules/vite/bin/vite.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 15,
      min_uptime: "5s",
      restart_delay: 3000,
      kill_timeout: 8000,
      env: {
        NODE_ENV: "development",
      },
      error_file: path.join(logDir, "pm2-frontend-error.log"),
      out_file: path.join(logDir, "pm2-frontend-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
