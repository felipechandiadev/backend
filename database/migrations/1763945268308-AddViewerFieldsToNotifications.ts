import { MigrationInterface, QueryRunner } from "typeorm";

export class AddViewerFieldsToNotifications1763945268308 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const existingColumns = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'notifications'
        `);

        const columnNames = existingColumns.map((col: any) => col.COLUMN_NAME);

        const columnsToAdd: string[] = [];

        if (!columnNames.includes('firstViewerId')) {
            columnsToAdd.push('ADD COLUMN firstViewerId VARCHAR(36) NULL');
        }
        if (!columnNames.includes('firstViewedAt')) {
            columnsToAdd.push('ADD COLUMN firstViewedAt DATETIME NULL');
        }

        if (columnsToAdd.length > 0) {
            await queryRunner.query(`
                ALTER TABLE notifications
                ${columnsToAdd.join(', ')}
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE notifications
            DROP COLUMN firstViewerId,
            DROP COLUMN firstViewedAt
        `);
    }

}
