import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class MigratePropertyToSpecification1733257200000 implements MigrationInterface {
  name = 'MigratePropertyToSpecification1733257200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('properties');
    if (!table) {
      throw new Error('Properties table not found');
    }
    const existingColumns = table.columns.map(col => col.name);

    // First, add the new UUID column if it doesn't exist
    if (!existingColumns.includes('new_id')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'new_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }));

      // Generate UUIDs for existing records
      await queryRunner.query(`
        UPDATE properties
        SET new_id = UUID()
        WHERE new_id IS NULL
      `);
    }

    // Add new columns for pricing if they don't exist
    if (!existingColumns.includes('rentPriceCLP')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'rentPriceCLP',
        type: 'bigint',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('rentPriceUF')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'rentPriceUF',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('expenses')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'expenses',
        type: 'bigint',
        isNullable: true,
      }));
    }

    // Add SEO columns if they don't exist
    if (!existingColumns.includes('seoKeywords')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'seoKeywords',
        type: 'text',
        isNullable: true,
      }));
    }

    // Add publication columns if they don't exist
    if (!existingColumns.includes('isFeatured')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'isFeatured',
        type: 'boolean',
        default: false,
      }));
    }

    if (!existingColumns.includes('priority')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'priority',
        type: 'int',
        default: 0,
      }));
    }

    // Add physical characteristics if they don't exist
    if (!existingColumns.includes('propertyType')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'propertyType',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('floors')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'floors',
        type: 'int',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('constructionYear')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'constructionYear',
        type: 'int',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('amenities')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'amenities',
        type: 'text',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('nearbyServices')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'nearbyServices',
        type: 'text',
        isNullable: true,
      }));
    }

    // Add location columns if they don't exist
    if (!existingColumns.includes('address')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'address',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('city')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'city',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('neighborhood')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'neighborhood',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('zipCode')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'zipCode',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }));
    }

    // Add statistics columns if they don't exist
    if (!existingColumns.includes('viewCount')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'viewCount',
        type: 'int',
        default: 0,
      }));
    }

    if (!existingColumns.includes('favoriteCount')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'favoriteCount',
        type: 'int',
        default: 0,
      }));
    }

    if (!existingColumns.includes('contactCount')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'contactCount',
        type: 'int',
        default: 0,
      }));
    }

    // Add internal notes if they don't exist
    if (!existingColumns.includes('internalNotes')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'internalNotes',
        type: 'text',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('rejectionReason')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'rejectionReason',
        type: 'text',
        isNullable: true,
      }));
    }

    // Add timestamp columns if they don't exist
    if (!existingColumns.includes('publishedAt')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'publishedAt',
        type: 'datetime',
        isNullable: true,
      }));
    }

    if (!existingColumns.includes('lastModifiedAt')) {
      await queryRunner.addColumn('properties', new TableColumn({
        name: 'lastModifiedAt',
        type: 'datetime',
        isNullable: true,
      }));
    }

    console.log('Property table migration completed (idempotent)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration is not reversible due to data complexity
    console.log('Migration rollback not implemented for safety');
  }
}