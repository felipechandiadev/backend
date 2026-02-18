import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const checkMultimediaUrls = async () => {
  try {
    const connection = await createConnection({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'real_estate',
      synchronize: false,
      logging: true,
    });

    console.log('Checking multimedia URLs...');

    // Get all multimedia URLs
    const multimedia = await connection.query('SELECT id, url FROM multimedia LIMIT 10');

    console.log('Current multimedia URLs:');
    multimedia.forEach((item: any) => {
      console.log(`ID: ${item.id}, URL: ${item.url}`);
    });

    await connection.close();
  } catch (error) {
    console.error('Error checking multimedia URLs:', error);
    process.exit(1);
  }
};

checkMultimediaUrls();