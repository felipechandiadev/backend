import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

// Load environment variables from the backend/.env file
dotenv.config({ path: join(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'mysql',
  driver: require('mysql2'),
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'real_estate_platform',
  entities: [join(__dirname, '../../src/entities/**/*.entity{.ts,.js}')],
  synchronize: false,
  logging: true,
});

// Attach SSL options to the DataSource if requested via env
const dbSslEnabled = (process.env.DB_SSL || '').toLowerCase() === 'true' || (process.env.DB_SSL || '') === '1';
if (dbSslEnabled) {
  const sslMode = process.env.DB_SSL_MODE || 'REQUIRED';
  let sslOption: any = {};
  if (process.env.DB_SSL_CA_PATH) {
    try {
      const ca = fs.readFileSync(process.env.DB_SSL_CA_PATH);
      sslOption.ca = ca;
    } catch (err) {
      console.warn('Could not read DB_SSL_CA_PATH:', process.env.DB_SSL_CA_PATH, err);
    }
  } else if (process.env.DB_SSL_CA) {
    sslOption.ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n');
  }

  if (!sslOption.ca) {
    // fallback: set rejectUnauthorized according to SSL mode
    sslOption.rejectUnauthorized = sslMode.toUpperCase() !== 'DISABLED';
  }

  // set extra ssl options for mysql2 driver
  // @ts-ignore
  AppDataSource.options.extra = Object.assign(AppDataSource.options.extra || {}, { ssl: sslOption });
}

export const initializeDataSource = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');
  } catch (err) {
    console.error('Error during Data Source initialization:', err);
    throw err;
  }
};