import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentTypeToPayments1767708290000 implements MigrationInterface {
    name = 'AddPaymentTypeToPayments1767708290000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column already exists
        const table = await queryRunner.getTable('payments');
        const hasType = table?.columns.find(column => column.name === 'type');

        if (hasType) {
            return;
        }

        // Add type column to payments table with enum values
        await queryRunner.query(`
            ALTER TABLE \`payments\`
            ADD COLUMN \`type\` enum('COMMISSION_INCOME', 'RENT_PAYMENT', 'SALE_DOWN_PAYMENT', 'SALE_INSTALLMENT', 'SALE_FINAL_PAYMENT', 'DEPOSIT', 'MAINTENANCE_FEE', 'UTILITIES', 'OTHER') NOT NULL DEFAULT 'OTHER' AFTER \`description\`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove type column from payments table
        await queryRunner.query(`
            ALTER TABLE \`payments\`
            DROP COLUMN \`type\`
        `);
    }
}