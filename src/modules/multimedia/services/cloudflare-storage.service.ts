import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import { IStorageProvider } from './storage-provider.interface';

@Injectable()
export class CloudflareStorageService implements IStorageProvider {
  private readonly logger = new Logger(CloudflareStorageService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'realestate-media-prod');
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL', '');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn('⚠️ Cloudflare R2 configuration missing. Service will not be available.');
      return;
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`✅ Cloudflare R2 initialized: ${this.bucketName}`);
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(
    fileBuffer: Buffer,
    relativePath: string,
    contentType: string,
  ): Promise<string> {
    try {
      // Normalizar path (remover slashes iniciales)
      const key = relativePath.replace(/^\/+/, '');

      this.logger.log(`📤 Uploading to R2: ${key} (${fileBuffer.length} bytes)`);

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
          Metadata: {
            uploadedAt: new Date().toISOString(),
            source: 'realestate-backend',
          },
        },
      });

      await upload.done();

      const publicUrl = this.getPublicUrl(key);
      this.logger.log(`✅ Upload successful: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      this.logger.error(`❌ Error uploading to R2: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to upload file to R2: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(relativePath: string): Promise<void> {
    try {
      const key = relativePath.replace(/^\/+/, '');

      this.logger.log(`🗑️ Deleting from R2: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`✅ Delete successful: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Error deleting from R2: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to delete file from R2: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Download a file from R2 as Buffer
   */
  async downloadFile(relativePath: string): Promise<Buffer> {
    try {
      const key = relativePath.replace(/^\/+/, '');

      this.logger.log(`📥 Downloading from R2: ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const stream = response.Body as Readable;

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`❌ Error downloading from R2: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to download file from R2: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Check if a file exists in R2
   */
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const key = relativePath.replace(/^\/+/, '');

      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generate public URL for a file
   */
  getPublicUrl(relativePath: string): string {
    const key = relativePath.replace(/^\/+/, '');

    if (this.publicUrl) {
      // Si hay R2_PUBLIC_URL configurada (dominio personalizado o r2.dev)
      return `${this.publicUrl}/${key}`;
    }

    // Fallback: URL directa al bucket (requiere acceso público)
    return `https://${this.bucketName}.r2.dev/${key}`;
  }

  /**
   * Get bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}
