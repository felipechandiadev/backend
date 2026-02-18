import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStatusToPayments1736383000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'payments';
    const hasStatusColumn = await queryRunner.hasColumn(tableName, 'status');

    if (!hasStatusColumn) {
      // Add status column as nullable first
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'status',
          type: 'enum',
          enum: ['PENDING', 'PAID', 'CANCELLED'],
          isNullable: true,
        }),
      );
    }

    // Set default value for existing records
    await queryRunner.query(`
      UPDATE ${tableName} 
      SET status = 'PENDING' 
      WHERE status IS NULL OR status = ''
    `);

    // Make column NOT NULL with default
    const statusColumnExists = await queryRunner.hasColumn(tableName, 'status');
    if (statusColumnExists) {
      await queryRunner.query(
        `ALTER TABLE ${tableName} MODIFY status enum('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'payments';
    const hasStatusColumn = await queryRunner.hasColumn(tableName, 'status');
    if (hasStatusColumn) {
      await queryRunner.dropColumn(tableName, 'status');
    }
  }
}
