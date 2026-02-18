import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const runMigrations = async () => {
  try {
    const connection = await createConnection({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'real_estate',
      entities: ['src/**/*.entity.ts'],
      migrations: ['database/migrations/*.ts'],
      synchronize: false,
      logging: true,
    });

    console.log('Running migrations...');
    await connection.runMigrations();
    console.log('Migrations completed successfully!');
    
    await connection.close();
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
};

runMigrations();