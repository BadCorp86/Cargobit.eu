/**
 * CargoBit File Storage Service
 * 
 * S3/MinIO Integration for:
 * - Document upload (CMR, POD, etc.)
 * - Insurance policy PDFs
 * - Profile images
 * - Ad campaign assets
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ===========================================
// TYPES
// ===========================================
export interface UploadOptions {
  bucket?: string;
  key: string;
  body: Buffer | Blob | string;
  contentType: string;
  metadata?: Record<string, string>;
  expiresIn?: number;  // URL expiration in seconds
}

export interface UploadResult {
  key: string;
  url: string;
  signedUrl?: string;
  bucket: string;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export type DocumentType = 
  | 'cmr'
  | 'pod'
  | 'invoice'
  | 'insurance_policy'
  | 'insurance_claim'
  | 'photo_pickup'
  | 'photo_delivery'
  | 'driver_license'
  | 'adr_certificate'
  | 'vehicle_registration'
  | 'profile_image'
  | 'ad_banner';

// ===========================================
// STORAGE SERVICE CLASS
// ===========================================
class StorageService {
  private client: S3Client | null = null;
  private bucket: string;
  private enabled: boolean;

  constructor() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'eu-central-1';
    const endpoint = process.env.AWS_S3_ENDPOINT;

    this.bucket = process.env.AWS_S3_BUCKET || 'cargobit-documents';
    this.enabled = !!(accessKeyId && secretAccessKey);

    if (this.enabled) {
      this.client = new S3Client({
        region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: !!endpoint, // Required for MinIO
      });
    } else {
      console.warn('⚠️ AWS S3 credentials not configured. File storage will be simulated.');
    }
  }

  // ===========================================
  // UPLOAD
  // ===========================================

  /**
   * Upload a file
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    const bucket = options.bucket || this.bucket;
    const key = options.key;

    if (!this.client) {
      console.log('📤 [DEV] File upload:', { bucket, key, size: Buffer.byteLength(options.body as Buffer) });
      return {
        key,
        url: `https://storage.cargobit.eu/${bucket}/${key}`,
        bucket,
      };
    }

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: options.body,
        ContentType: options.contentType,
        Metadata: options.metadata,
      });

      await this.client.send(command);

      const url = `https://${bucket}.s3.${process.env.AWS_REGION || 'eu-central-1'}.amazonaws.com/${key}`;

      return {
        key,
        url,
        bucket,
      };
    } catch (error: any) {
      console.error('❌ Upload error:', error.message);
      throw error;
    }
  }

  /**
   * Upload document for a transport
   */
  async uploadTransportDocument(
    transportId: string,
    documentType: DocumentType,
    file: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    const extension = this.getExtension(contentType);
    const key = `transports/${transportId}/${documentType}_${Date.now()}${extension}`;

    return this.upload({
      key,
      body: file,
      contentType,
      metadata: {
        transportId,
        documentType,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Upload insurance policy PDF
   */
  async uploadInsurancePolicy(
    policyId: string,
    policyNumber: string,
    pdfBuffer: Buffer
  ): Promise<UploadResult> {
    const key = `insurance/policies/${policyId}/${policyNumber}.pdf`;

    return this.upload({
      key,
      body: pdfBuffer,
      contentType: 'application/pdf',
      metadata: {
        policyId,
        policyNumber,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(
    userId: string,
    imageBuffer: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    const extension = this.getExtension(contentType);
    const key = `profiles/${userId}/avatar${extension}`;

    return this.upload({
      key,
      body: imageBuffer,
      contentType,
      metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Upload ad banner
   */
  async uploadAdBanner(
    campaignId: string,
    imageBuffer: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    const extension = this.getExtension(contentType);
    const key = `ads/banners/${campaignId}/banner${extension}`;

    return this.upload({
      key,
      body: imageBuffer,
      contentType,
      metadata: {
        campaignId,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  // ===========================================
  // DOWNLOAD
  // ===========================================

  /**
   * Get a signed URL for downloading a file
   */
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) {
      return `https://storage.cargobit.eu/download/${key}`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error: any) {
      console.error('❌ Get signed URL error:', error.message);
      throw error;
    }
  }

  /**
   * Download a file
   */
  async download(key: string): Promise<Buffer | null> {
    if (!this.client) {
      console.log('📥 [DEV] File download:', key);
      return Buffer.from('Mock file content');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      const body = await response.Body?.transformToByteArray();
      return Buffer.from(body || []);
    } catch (error: any) {
      console.error('❌ Download error:', error.message);
      return null;
    }
  }

  // ===========================================
  // DELETE
  // ===========================================

  /**
   * Delete a file
   */
  async delete(key: string): Promise<{ success: boolean }> {
    if (!this.client) {
      console.log('🗑️ [DEV] File delete:', key);
      return { success: true };
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Delete error:', error.message);
      return { success: false };
    }
  }

  // ===========================================
  // METADATA
  // ===========================================

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<FileMetadata | null> {
    if (!this.client) return null;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(prefix: string): Promise<FileMetadata[]> {
    if (!this.client) return [];

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await this.client.send(command);

      return (response.Contents || []).map(item => ({
        key: item.Key || '',
        size: item.Size || 0,
        contentType: 'application/octet-stream',
        lastModified: item.LastModified || new Date(),
      }));
    } catch (error) {
      return [];
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get file extension from content type
   */
  private getExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'text/plain': '.txt',
      'application/json': '.json',
    };

    return extensions[contentType] || '';
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Copy a file
   */
  async copy(sourceKey: string, destinationKey: string): Promise<{ success: boolean }> {
    if (!this.client) {
      console.log('📋 [DEV] File copy:', sourceKey, '→', destinationKey);
      return { success: true };
    }

    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.client.send(command);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Copy error:', error.message);
      return { success: false };
    }
  }

  /**
   * Generate a unique file key
   */
  generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${prefix}/${timestamp}_${random}_${sanitized}`;
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;
