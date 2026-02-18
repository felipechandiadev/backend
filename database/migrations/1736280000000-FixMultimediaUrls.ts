import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMultimediaUrls1736280000000 implements MigrationInterface {
  name = 'FixMultimediaUrls1736280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get current environment variables or use defaults
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || '3001';
    const baseUrl = `${protocol}://${host}:${port}`;

    // Update multimedia URLs that start with "/uploads/" to absolute URLs
    await queryRunner.query(`
      UPDATE multimedia
      SET url = CONCAT('${baseUrl}', url)
      WHERE url LIKE '/uploads/%'
    `);

    console.log('Multimedia URLs updated to absolute URLs successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get current environment variables or use defaults
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || '3001';
    const baseUrl = `${protocol}://${host}:${port}`;

    // Revert multimedia URLs from absolute back to relative
    await queryRunner.query(`
      UPDATE multimedia
      SET url = REPLACE(url, '${baseUrl}', '')
      WHERE url LIKE '${baseUrl}/uploads/%'
    `);

    console.log('Multimedia URLs reverted to relative URLs successfully');
  }
}