import { MigrationInterface, QueryRunner } from "typeorm";

export class FixIsActiveTypeTestimonials1762767000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cambia el tipo de columna isActive a TINYINT(1) NOT NULL DEFAULT 1
    await queryRunner.query(`ALTER TABLE testimonials MODIFY COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Si quieres revertir, lo puedes volver a VARCHAR(10)
    await queryRunner.query(`ALTER TABLE testimonials MODIFY COLUMN isActive VARCHAR(10) NOT NULL DEFAULT 'true'`);
  }
}
