import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddContractChangeHistory1768300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'contracts',
      new TableColumn({
        name: 'changeHistory',
        type: 'json',
        isNullable: true,
      }),
    );

    const contracts = await queryRunner.query('SELECT id, changeHistory FROM contracts');

    for (const contract of contracts as Array<{ id: string; changeHistory: unknown }>) {
      if (contract.changeHistory == null) {
        await queryRunner.query(
          'UPDATE contracts SET changeHistory = ? WHERE id = ?',
          [JSON.stringify([]), contract.id],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('contracts', 'changeHistory');
  }
}
