module.exports = {
  apps: [{
    name: 'nest-server',
    script: 'server.js',
    cwd: '/var/www/nest/server',
    interpreter: 'node',
    interpreter_args: '--experimental-vm-modules',
    max_memory_restart: '350M',
    restart_delay: 5000,
    max_restarts: 5,
    min_uptime: '10s',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};