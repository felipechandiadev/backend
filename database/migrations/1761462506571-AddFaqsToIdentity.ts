import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFaqsToIdentity1761462506571 implements MigrationInterface {
    name = 'AddFaqsToIdentity1761462506571'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const existingColumns = await queryRunner.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'identities'
            AND COLUMN_NAME = 'faqs'
        `);

        if (existingColumns.length === 0) {
            await queryRunner.query(`ALTER TABLE \`identities\` ADD \`faqs\` json NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`identities\` DROP COLUMN \`faqs\``);
    }

}
