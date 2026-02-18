import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPersonIdToDocument1735450000000 implements MigrationInterface {
    name = 'AddPersonIdToDocument1735450000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column already exists
        const table = await queryRunner.getTable('documents');
        const hasPersonId = table?.columns.find(column => column.name === 'personId');
        
        if (hasPersonId) {
            return;
        }

        // Add personId column to documents table
        await queryRunner.query(`
            ALTER TABLE \`documents\`
            ADD COLUMN \`personId\` char(36) NULL AFTER \`uploadedById\`
        `);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE \`documents\`
            ADD CONSTRAINT \`FK_document_person\`
            FOREIGN KEY (\`personId\`) REFERENCES \`people\`(\`id\`)
            ON DELETE SET NULL
            ON UPDATE NO ACTION
        `);

        // Add index for better query performance
        await queryRunner.query(`
            CREATE INDEX \`IDX_document_person\` ON \`documents\` (\`personId\`)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove foreign key constraint
        await queryRunner.query(`
            ALTER TABLE \`documents\`
            DROP FOREIGN KEY \`FK_document_person\`
        `);

        // Remove index
        await queryRunner.query(`
            DROP INDEX \`IDX_document_person\` ON \`documents\`
        `);

        // Remove column
        await queryRunner.query(`
            ALTER TABLE \`documents\`
            DROP COLUMN \`personId\`
        `);
    }
}
