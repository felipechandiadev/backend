import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMainImageUrlToProperty1761380659308 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`properties\` ADD \`mainImageUrl\` varchar(500) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`properties\` DROP COLUMN \`mainImageUrl\``);
    }

}
