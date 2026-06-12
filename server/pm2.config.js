/**
 * PM2 Ecosystem Config — Vishvyash ERP
 *
 * Usage:
 *   pm2 start pm2.config.js          # Start using this config
 *   pm2 start pm2.config.js --env production
 *   pm2 restart pm2.config.js
 *   pm2 save                          # Save after starting
 */

module.exports = {
  apps: [
    {
      name: 'vishvyash-erp',
      script: './dist/src/index.js',
      cwd: __dirname,

      // Environment variables — PM2 reads these on start
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Load .env file automatically
      env_file: './.env',

      // Restart policy
      restart_delay: 3000,         // Wait 3s before restart
      max_restarts: 10,             // Max 10 restarts before stop
      min_uptime: '10s',            // Must run 10s to count as stable

      // Logging
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Watch (disabled in production — restart manually after deploy)
      watch: false,

      // Memory limit — restart if exceeds 512MB
      max_memory_restart: '512M',
    },
  ],
};
