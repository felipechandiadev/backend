import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequiredToDocuments1769200000000 implements MigrationInterface {
  name = 'AddRequiredToDocuments1769200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" ADD "required" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "required"`);
  }
}
