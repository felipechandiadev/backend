import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationEntityUpdate1736280496531 implements MigrationInterface {
  name = 'NotificationEntityUpdate1736280496531'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('notifications');
    if (!table) {
      throw new Error('Notifications table not found');
    }
    const existingColumns = table.columns.map(col => col.name);

    // Add columns that don't exist
    if (!existingColumns.includes('senderType')) {
      await queryRunner.query(`ALTER TABLE notifications ADD COLUMN senderType varchar(32) NOT NULL DEFAULT 'SYSTEM'`);
    }
    if (!existingColumns.includes('senderId')) {
      await queryRunner.query(`ALTER TABLE notifications ADD COLUMN senderId varchar(64) NULL`);
    }
    if (!existingColumns.includes('senderName')) {
      await queryRunner.query(`ALTER TABLE notifications ADD COLUMN senderName varchar(128) NOT NULL DEFAULT ''`);
    }
    if (!existingColumns.includes('isSystem')) {
      await queryRunner.query(`ALTER TABLE notifications ADD COLUMN isSystem boolean NOT NULL DEFAULT false`);
    }
    if (!existingColumns.includes('message')) {
      await queryRunner.query(`ALTER TABLE notifications ADD COLUMN message text NOT NULL`);
      // Set default values for existing records
      await queryRunner.query(`UPDATE notifications SET message = 'Notificación migrada' WHERE message IS NULL OR message = ''`);
    }
    if (!existingColumns.includes('firstViewerId')) {
      await queryRunner.query(`ALTER TABLE notifications ADD COLUMN firstViewerId varchar(64) NULL`);
    }
    if (!existingColumns.includes('firstViewedAt')) {
      await queryRunner.query(`ALTER TABLE notifications ADD COLUMN firstViewedAt datetime NULL`);
    }

    // Update existing records
    await queryRunner.query(`UPDATE notifications SET senderType='SYSTEM', senderName='Sistema', isSystem=true WHERE senderType IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE notifications
      DROP COLUMN senderType,
      DROP COLUMN senderId,
      DROP COLUMN senderName,
      DROP COLUMN isSystem,
      DROP COLUMN message,
      DROP COLUMN firstViewerId,
      DROP COLUMN firstViewedAt
    `);
  }
}
