import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgencyRevenueToPayments1769000000000 implements MigrationInterface {
    name = 'AddAgencyRevenueToPayments1769000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('payments');
        const hasColumn = table?.columns.some((column) => column.name === 'isAgencyRevenue');

        if (hasColumn) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`payments\`
            ADD COLUMN \`isAgencyRevenue\` tinyint(1) NOT NULL DEFAULT 0 AFTER \`paidAt\`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('payments');
        const hasColumn = table?.columns.some((column) => column.name === 'isAgencyRevenue');

        if (!hasColumn) {
            return;
        }

        await queryRunner.query(`
            ALTER TABLE \`payments\`
            DROP COLUMN \`isAgencyRevenue\`
        `);
    }
}
