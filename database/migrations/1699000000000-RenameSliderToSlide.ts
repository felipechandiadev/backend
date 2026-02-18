import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSliderToSlide1699000000000 implements MigrationInterface {
  name = 'RenameSliderToSlide1699000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if sliders table exists and slides table doesn't exist
    const slidersTableExists = await queryRunner.hasTable('sliders');
    const slidesTableExists = await queryRunner.hasTable('slides');

    if (slidersTableExists && !slidesTableExists) {
      // Renombrar tabla de sliders a slides
      await queryRunner.query(`ALTER TABLE \`sliders\` RENAME TO \`slides\``);
    } else if (!slidersTableExists && slidesTableExists) {
      // Migration already completed
      console.log('Migration already completed: slides table exists');
    } else if (slidersTableExists && slidesTableExists) {
      // Both tables exist, drop the empty one
      const slidersCount = await queryRunner.query('SELECT COUNT(*) as count FROM sliders');
      if (parseInt(slidersCount[0].count) === 0) {
        await queryRunner.query('DROP TABLE sliders');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if slides table exists
    const slidesTableExists = await queryRunner.hasTable('slides');
    const slidersTableExists = await queryRunner.hasTable('sliders');

    if (slidesTableExists && !slidersTableExists) {
      // Revertir: renombrar tabla de slides a sliders
      await queryRunner.query(`ALTER TABLE \`slides\` RENAME TO \`sliders\``);
    }
  }
}