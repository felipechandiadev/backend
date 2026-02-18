import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCodeToProperty1736332700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'properties';
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

    // 2. Generar códigos para propiedades existentes
    const properties = await queryRunner.query(`
      SELECT id, operationType, createdAt 
      FROM ${tableName} 
      WHERE deletedAt IS NULL 
        AND (code IS NULL OR code = '')
      ORDER BY createdAt ASC
    `);

    const counters: { [key: string]: number } = {};

    for (const property of properties) {
      const year = new Date(property.createdAt).getFullYear().toString().slice(-2);
      const prefix = property.operationType === 'SALE' ? 'PV' : 'PA';
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
        [code, property.id],
      );
    }

    // 3. Hacer la columna NOT NULL
    const codeColumn = await queryRunner.hasColumn(tableName, 'code');
    if (codeColumn) {
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
    const tableName = 'properties';

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
