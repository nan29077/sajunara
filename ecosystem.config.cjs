module.exports = {
  apps: [
    {
      name: 'sajunara',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000 -H 0.0.0.0',
      cwd: '/home/user/webapp/app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=512',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '450M',
      autorestart: true,
      min_uptime: '5s',
      max_restarts: 10,
      restart_delay: 1000,
    },
  ],
};
