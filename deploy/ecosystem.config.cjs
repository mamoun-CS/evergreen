module.exports = {
  apps: [{
    name: 'evergreen-store',
    cwd: '/var/www/evergreen/app',
    script: 'npm',
    args: 'run start',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: '3000' },
    node_args: '--env-file=/etc/evergreen/evergreen.env',
  }],
};
