module.exports = {
  apps: [
    {
      name: 'open-sales-assistant',
      script: 'server/index.js',
      cwd: '/opt/open-sales-assistant',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3100
      }
    }
  ]
};
