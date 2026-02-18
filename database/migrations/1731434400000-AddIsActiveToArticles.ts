import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToArticles1731434400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'articles',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('articles', 'is_active');
  }
}
