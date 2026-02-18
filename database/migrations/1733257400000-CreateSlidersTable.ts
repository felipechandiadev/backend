import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSlidersTable1733257400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('sliders');
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'sliders',
          columns: [
            {
              name: 'id',
              type: 'varchar',
              length: '36',
              isPrimary: true,
              generationStrategy: 'uuid',
            },
            {
              name: 'title',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'imageUrl',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'duration',
              type: 'int',
              default: 3,
            },
            {
              name: 'startDate',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'endDate',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'order',
              type: 'int',
              default: 0,
            },
            {
              name: 'createdAt',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updatedAt',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'deletedAt',
              type: 'datetime',
              isNullable: true,
            },
          ],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sliders');
  }
}