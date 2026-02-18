const { DataSource } = require('typeorm');
require('dotenv').config();

module.exports = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306') || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'real_estate',
  entities: ['dist/**/*.entity.js'],
  migrations: ['database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});