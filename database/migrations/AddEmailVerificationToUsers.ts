import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerificationToUsers1700000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist to make migration idempotent
    const table = await queryRunner.getTable('users');

    if (!table) {
      console.warn('Users table not found');
      return;
    }

    // Agregar emailVerified
    if (
      !table.columns.find(
        (col) => col.name === 'emailVerified',
      )
    ) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'emailVerified',
          type: 'boolean',
          default: false,
          isNullable: false,
        }),
      );
    }

    // Agregar emailVerificationToken
    if (
      !table.columns.find(
        (col) => col.name === 'emailVerificationToken',
      )
    ) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'emailVerificationToken',
          type: 'varchar',
          length: '500',
          isNullable: true,
        }),
      );
    }

    // Agregar emailVerificationExpires
    if (
      !table.columns.find(
        (col) => col.name === 'emailVerificationExpires',
      )
    ) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'emailVerificationExpires',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    if (!table) {
      return;
    }

    if (table.columns.find((col) => col.name === 'emailVerificationExpires')) {
      await queryRunner.dropColumn('users', 'emailVerificationExpires');
    }

    if (table.columns.find((col) => col.name === 'emailVerificationToken')) {
      await queryRunner.dropColumn('users', 'emailVerificationToken');
    }

    if (table.columns.find((col) => col.name === 'emailVerified')) {
      await queryRunner.dropColumn('users', 'emailVerified');
    }
  }
}
