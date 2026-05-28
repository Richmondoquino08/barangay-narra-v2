module.exports = {
  apps: [
    {
      name: 'barangay-backend',
      script: 'backend/app.js',
      cwd: __dirname + '/../',
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        HOST: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        HOST: '0.0.0.0',
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
    },
  ],
};
