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
export class AwsS3StorageService implements IStorageProvider {
  private readonly logger = new Logger(AwsS3StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string | null = null;
  private publicUrl: string | null = null;
  private region: string | null = null;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION');
    const bucket = this.configService.get<string>('S3_BUCKET_NAME');
    const publicUrl = this.configService.get<string>('S3_PUBLIC_URL', '');

    if (!accessKeyId || !secretAccessKey || !bucket || !region) {
      this.logger.warn('⚠️ AWS S3 configuration missing or incomplete. Service will not be available.');
      return;
    }

    this.region = region;
    this.bucketName = bucket;
    this.publicUrl = publicUrl || null;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`✅ AWS S3 initialized: ${this.bucketName} (${this.region})`);
  }

  private ensureClient(): S3Client {
    if (!this.s3Client) {
      throw new HttpException('S3 client not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return this.s3Client;
  }

  async uploadFile(fileBuffer: Buffer, relativePath: string, contentType: string): Promise<string> {
    try {
      const key = relativePath.replace(/^\/+/, '');
      this.logger.log(`📤 Uploading to S3: ${key} (${fileBuffer.length} bytes)`);

      const upload = new Upload({
        client: this.ensureClient(),
        params: {
          Bucket: this.bucketName!,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
        },
      });

      await upload.done();

      const publicUrl = this.getPublicUrl(key);
      this.logger.log(`✅ Upload successful: ${publicUrl}`);
      return publicUrl;
    } catch (error: any) {
      this.logger.error(`❌ Error uploading to S3: ${error?.message ?? error}`, error?.stack);
      throw new HttpException(`Failed to upload file to S3: ${error?.message ?? error}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    try {
      const key = relativePath.replace(/^\/+/, '');
      this.logger.log(`🗑️ Deleting from S3: ${key}`);

      const command = new DeleteObjectCommand({ Bucket: this.bucketName!, Key: key });
      await this.ensureClient().send(command);
      this.logger.log(`✅ Delete successful: ${key}`);
    } catch (error: any) {
      this.logger.error(`❌ Error deleting from S3: ${error?.message ?? error}`, error?.stack);
      throw new HttpException(`Failed to delete file from S3: ${error?.message ?? error}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async downloadFile(relativePath: string): Promise<Buffer> {
    try {
      const key = relativePath.replace(/^\/+/, '');
      this.logger.log(`📥 Downloading from S3: ${key}`);

      const command = new GetObjectCommand({ Bucket: this.bucketName!, Key: key });
      const response = await this.ensureClient().send(command);
      const stream = response.Body as Readable;

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      this.logger.error(`❌ Error downloading from S3: ${error?.message ?? error}`, error?.stack);
      throw new HttpException(`Failed to download file from S3: ${error?.message ?? error}`, HttpStatus.NOT_FOUND);
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const key = relativePath.replace(/^\/+/, '');
      const command = new HeadObjectCommand({ Bucket: this.bucketName!, Key: key });
      await this.ensureClient().send(command);
      return true;
    } catch (error: any) {
      if (error?.$metadata?.httpStatusCode === 404) return false;
      return false;
    }
  }

  getPublicUrl(relativePath: string): string {
    const key = relativePath.replace(/^\/+/, '');

    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    }

    // Standard S3 public URL (works for public buckets / CloudFront fronted buckets)
    // Prefer region-specific URL when region is set
    if (this.region) {
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    }

    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }

  getBucketName(): string {
    return this.bucketName || '';
  }
}
