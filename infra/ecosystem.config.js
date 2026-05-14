module.exports = {
  apps: [
    {
      name: "hall-of-legends",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/ubuntu/hall-of-legends",
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
