module.exports = {
  apps: [
    {
      name: "ausverse-ai",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/app",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
