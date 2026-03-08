// PM2 Ecosystem Config — Smart Bus
// Usage: pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "smart-bus-api",
      script: "src/server.js",
      cwd: "./backend",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "300M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
    },
    {
      name: "ml-service",
      script: "ML_model_PassP/venv/bin/gunicorn",
      args: "-w 2 -b 0.0.0.0:5001 ml_service:app",
      cwd: "./ML_model_PassP",
      interpreter: "none",
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/ml-error.log",
      out_file: "./logs/ml-out.log",
    },
  ],
};
