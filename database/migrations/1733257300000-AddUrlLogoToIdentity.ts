import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUrlLogoToIdentity1733257300000 implements MigrationInterface {
    name = 'AddUrlLogoToIdentity1733257300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('identities');
        if (!table) {
            throw new Error('Identities table not found');
        }
        const existingColumns = table.columns.map(col => col.name);

        if (!existingColumns.includes('urlLogo')) {
            await queryRunner.query(`ALTER TABLE \`identities\` ADD \`urlLogo\` varchar(500) NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`identities\` DROP COLUMN \`urlLogo\``);
    }

}