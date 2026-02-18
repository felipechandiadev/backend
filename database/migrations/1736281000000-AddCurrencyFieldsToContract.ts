import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCurrencyFieldsToContract1736281000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'contracts';

    const hasCurrencyColumn = await queryRunner.hasColumn(tableName, 'currency');
    if (!hasCurrencyColumn) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'currency',
          type: 'enum',
          enum: ['CLP', 'UF'],
          default: "'CLP'",
          isNullable: false,
        }),
      );
    }

    const hasUfValueColumn = await queryRunner.hasColumn(tableName, 'ufValue');
    if (!hasUfValueColumn) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'ufValue',
          type: 'float',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'contracts';

    const hasUfValueColumn = await queryRunner.hasColumn(tableName, 'ufValue');
    if (hasUfValueColumn) {
      await queryRunner.dropColumn(tableName, 'ufValue');
    }

    const hasCurrencyColumn = await queryRunner.hasColumn(tableName, 'currency');
    if (hasCurrencyColumn) {
      await queryRunner.dropColumn(tableName, 'currency');
    }
  }
}
