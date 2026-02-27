module.exports = {
  apps: [
    {
      name: 'claude-remote',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'server/main.ts',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
