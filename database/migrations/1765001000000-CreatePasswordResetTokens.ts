import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePasswordResetTokens1765001000000 implements MigrationInterface {
    name = 'CreatePasswordResetTokens1765001000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable('password_reset_tokens');
        if (hasTable) {
            return;
        }

        await queryRunner.query(`
            CREATE TABLE \`password_reset_tokens\` (
                \`id\` char(36) NOT NULL,
                \`userId\` char(36) NOT NULL,
                \`token\` varchar(128) NOT NULL,
                \`expiresAt\` datetime NOT NULL,
                \`consumedAt\` datetime NULL,
                \`requestedIp\` varchar(45) NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_password_reset_token_token\` (\`token\`),
                INDEX \`IDX_password_reset_token_user\` (\`userId\`),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_password_reset_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable('password_reset_tokens');
        if (!hasTable) {
            return;
        }

        await queryRunner.query(`DROP TABLE \`password_reset_tokens\``);
    }

}
