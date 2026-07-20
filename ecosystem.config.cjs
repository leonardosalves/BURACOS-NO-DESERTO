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
      max_restarts: 100,
      min_uptime: "5s",
      restart_delay: 3000,
      exp_backoff_restart_delay: 2000,
      max_memory_restart: "3500M",
      kill_timeout: 20000,
      listen_timeout: 180000,
      shutdown_with_message: true,
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
      args: "--host 0.0.0.0 --port 5176 --strictPort",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 100,
      min_uptime: "3s",
      restart_delay: 2500,
      exp_backoff_restart_delay: 1500,
      kill_timeout: 12000,
      env: {
        NODE_ENV: "development",
      },
      error_file: path.join(logDir, "pm2-frontend-error.log"),
      out_file: path.join(logDir, "pm2-frontend-out.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "lumiera-sync",
      cwd: path.join(repoRoot, "dashboard-qanat", "backend"),
      script: "syncJob.js",
      instances: 1,
      exec_mode: "fork",
      cron_restart: "0 */6 * * *",
      autorestart: false,
      error_file: path.join(logDir, "pm2-sync-error.log"),
      out_file: path.join(logDir, "pm2-sync-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
