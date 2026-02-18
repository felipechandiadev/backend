import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInterestedUserFieldsToNotifications1763943454703 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const existingColumns = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'notifications'
        `);

        const columnNames = existingColumns.map((col: any) => col.COLUMN_NAME);

        const columnsToAdd: string[] = [];

        if (!columnNames.includes('interestedUserEmail')) {
            columnsToAdd.push('ADD COLUMN interestedUserEmail VARCHAR(255) NULL');
        }
        if (!columnNames.includes('interestedUserName')) {
            columnsToAdd.push('ADD COLUMN interestedUserName VARCHAR(255) NULL');
        }
        if (!columnNames.includes('interestedUserMessage')) {
            columnsToAdd.push('ADD COLUMN interestedUserMessage TEXT NULL');
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
            DROP COLUMN interestedUserEmail,
            DROP COLUMN interestedUserName,
            DROP COLUMN interestedUserMessage
        `);
    }

}
