module.exports = {
  apps: [
    {
      name: 'nest-server',
      cwd: '/var/www/nest',
      script: 'server/server.js',
      env: {
        NODE_ENV: 'production',
        NEST_SERVER_ENV_FILE: '/etc/nest-writing/server.env',
      },
    },
  ],
};
