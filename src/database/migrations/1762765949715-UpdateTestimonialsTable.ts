import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTestimonialsTable1762765949715 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Renombrar columna text a content
        await queryRunner.query(`ALTER TABLE "testimonials" RENAME COLUMN "text" TO "content"`);
        
        // Agregar nuevas columnas
        await queryRunner.query(`ALTER TABLE "testimonials" ADD COLUMN "position" varchar(255)`);
        await queryRunner.query(`ALTER TABLE "testimonials" ADD COLUMN "imageUrl" varchar(500)`);
        await queryRunner.query(`ALTER TABLE "testimonials" ADD COLUMN "isActive" boolean NOT NULL DEFAULT true`);
        
        // Remover la columna multimediaId si existe (ya no la necesitamos)
        await queryRunner.query(`ALTER TABLE "testimonials" DROP COLUMN IF EXISTS "multimediaId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir cambios
        await queryRunner.query(`ALTER TABLE "testimonials" DROP COLUMN IF EXISTS "isActive"`);
        await queryRunner.query(`ALTER TABLE "testimonials" DROP COLUMN IF EXISTS "imageUrl"`);
        await queryRunner.query(`ALTER TABLE "testimonials" DROP COLUMN IF EXISTS "position"`);
        
        // Renombrar content de vuelta a text
        await queryRunner.query(`ALTER TABLE "testimonials" RENAME COLUMN "content" TO "text"`);
        
        // Restaurar multimediaId si es necesario
        await queryRunner.query(`ALTER TABLE "testimonials" ADD COLUMN "multimediaId" uuid`);
    }

}
