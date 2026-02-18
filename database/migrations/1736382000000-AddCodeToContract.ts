import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCodeToContract1736382000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'contracts';
    const hasCodeColumn = await queryRunner.hasColumn(tableName, 'code');

    if (!hasCodeColumn) {
      // 1. Agregar columna code (nullable temporalmente)
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'code',
          type: 'varchar',
          length: '20',
          isNullable: true,
        }),
      );
    }

    // 2. Generar códigos para contratos existentes
    const contracts = await queryRunner.query(`
      SELECT id, operation, createdAt 
      FROM ${tableName} 
      WHERE deletedAt IS NULL 
        AND (code IS NULL OR code = '')
      ORDER BY createdAt ASC
    `);

    const counters: { [key: string]: number } = {};

    for (const contract of contracts) {
      const year = new Date(contract.createdAt).getFullYear().toString().slice(-2);
      const prefix = contract.operation === 'COMPRAVENTA' ? 'CV' : 'CA';
      const key = `${prefix}-${year}`;

      if (!counters[key]) {
        counters[key] = 1;
      } else {
        counters[key]++;
      }

      const sequence = counters[key].toString().padStart(7, '0');
      const code = `${prefix}-${year}-${sequence}`;

      await queryRunner.query(
        `UPDATE ${tableName} SET code = ? WHERE id = ?`,
        [code, contract.id],
      );
    }

    // 3. Hacer la columna NOT NULL
    const hasCodeAfterFill = await queryRunner.hasColumn(tableName, 'code');
    if (hasCodeAfterFill) {
      await queryRunner.query(
        `ALTER TABLE ${tableName} MODIFY code varchar(20) NOT NULL`
      );
    }

    // 4. Crear índice único si no existe
    const existingIndex = await queryRunner.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = 'code'
        AND NON_UNIQUE = 0
      LIMIT 1
    `);

    if (!existingIndex.length) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IDX_${tableName}_code_unique ON ${tableName} (code)`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'contracts';

    const existingIndex = await queryRunner.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = 'code'
        AND NON_UNIQUE = 0
      LIMIT 1
    `);

    if (existingIndex.length) {
      const indexName = existingIndex[0].INDEX_NAME;
      await queryRunner.query(`DROP INDEX ${indexName} ON ${tableName}`);
    }

    const hasCodeColumn = await queryRunner.hasColumn(tableName, 'code');
    if (hasCodeColumn) {
      await queryRunner.dropColumn(tableName, 'code');
    }
  }
}
