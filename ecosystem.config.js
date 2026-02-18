const path = require('path');
const { config } = require('dotenv');

const envPath = path.join(__dirname, '.env');
const { parsed = {}, error } = config({ path: envPath });

if (error) {
  throw error;
}

const resolvedEnv = Object.keys(parsed).reduce((acc, key) => {
  acc[key] = process.env[key] ?? parsed[key];
  return acc;
}, {});

if (resolvedEnv.NODE_ENV == null) {
  resolvedEnv.NODE_ENV = 'development';
}

if (resolvedEnv.PORT == null) {
  resolvedEnv.PORT = '3000';
}

module.exports = {
  apps: [
    {
      name: 'realestate-backend',
      cwd: __dirname,
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      ignore_watch: ['node_modules', 'dist'],
      env: resolvedEnv
    }
  ]
};
