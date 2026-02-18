import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { AwsS3StorageService } from '../src/modules/multimedia/services/aws-s3-storage.service';
import { UploadConfigService } from '../src/config/upload.config';
import { promises as fs } from 'fs';
import * as path from 'path';

const LOCAL_PUBLIC_SEGMENT = '/public/';

function guessContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.mp4':
      return 'video/mp4';
    case '.pdf':
      return 'application/pdf';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

async function migrate() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const s3 = app.get(AwsS3StorageService);
  const uploadConfig = app.get(UploadConfigService);

  // Ensure S3 is configured
  try {
    // try to access private internal client (throws if not configured)
    (s3 as any).getBucketName();
  } catch (err) {
    console.error('S3 is not configured. Set AWS_* env variables and S3_BUCKET_NAME / S3_PUBLIC_URL first.');
    await app.close();
    process.exit(1);
  }

  const uploadDir = uploadConfig.getUploadDir();

  console.log('🔎 Scanning multimedia records with local URLs...');
  const rows: Array<{ id: string; url: string }> = await dataSource.query(
    `SELECT id, url FROM multimedia WHERE url LIKE ?`,
    [`%${LOCAL_PUBLIC_SEGMENT}%`],
  );

  console.log(`Found ${rows.length} multimedia records referencing local files.`);

  const migrated: string[] = [];
  const skipped: string[] = [];

  for (const row of rows) {
    try {
      const url = row.url;
      const parts = url.split(LOCAL_PUBLIC_SEGMENT);
      if (parts.length < 2) {
        skipped.push(row.id);
        console.warn(`Skipping (cannot parse public path): ${url}`);
        continue;
      }

      const relativePath = parts[1]; // e.g. web/slides/xxx.jpg
      const fullPath = path.join(uploadDir, relativePath);

      try {
        await fs.access(fullPath);
      } catch (err) {
        skipped.push(row.id);
        console.warn(`File not found on disk, skipping: ${fullPath}`);
        continue;
      }

      const buffer = await fs.readFile(fullPath);
      const contentType = guessContentType(relativePath);

      console.log(`Uploading ${relativePath} -> S3...`);
      const publicUrl = await s3.uploadFile(buffer, relativePath, contentType);

      // Update multimedia row
      await dataSource.query(`UPDATE multimedia SET url = ? WHERE id = ?`, [publicUrl, row.id]);
      migrated.push(row.id);

      console.log(`  ✅ migrated -> ${publicUrl}`);
    } catch (err) {
      console.error(`Error migrating multimedia id=${row.id}:`, (err as any)?.message ?? err);
      skipped.push(row.id);
    }
  }

  console.log(`\n🔁 Rewriting other tables to point to S3 public URL (textual replacements)`);
  const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || '';
  const s3PublicUrl = process.env.S3_PUBLIC_URL || '';

  if (!backendPublicUrl || !s3PublicUrl) {
    console.warn('BACKEND_PUBLIC_URL or S3_PUBLIC_URL not set; skipping textual replacements. You should run update-r2-urls style script afterwards.');
  } else {
    const oldPrefix = `${backendPublicUrl}${LOCAL_PUBLIC_SEGMENT}`;
    const newPrefix = s3PublicUrl.replace(/\/$/, '') + '/';

    const updates = [
      { table: 'properties', column: 'mainImageUrl' },
      { table: 'multimedia', column: 'url' },
      { table: 'slides', column: 'multimediaUrl' },
      { table: 'articles', column: 'multimediaUrl' },
      { table: 'identities', column: 'urlLogo' },
      { table: 'team_members', column: 'multimediaUrl' },
      { table: 'about_us', column: 'multimediaUrl' },
      { table: 'testimonials', column: 'imageUrl' },
    ];

    for (const u of updates) {
      try {
        const result = await dataSource.query(
          `UPDATE ${u.table} SET ${u.column} = REPLACE(${u.column}, ?, ?) WHERE ${u.column} LIKE ?`,
          [oldPrefix, newPrefix, `${oldPrefix}%`],
        );
        console.log(`  ✅ ${u.table}.${u.column} updated`);
      } catch (err) {
        console.warn(`  ⚠️  Could not update ${u.table}.${u.column}:`, (err as any)?.message ?? err);
      }
    }
  }

  console.log('\n✨ Migration finished. Summary:');
  console.log(`  - migrated: ${migrated.length}`);
  console.log(`  - skipped : ${skipped.length}`);

  await app.close();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
