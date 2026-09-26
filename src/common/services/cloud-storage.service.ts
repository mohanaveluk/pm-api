import { Injectable, BadRequestException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { CustomLoggerService } from '../../modules/logger/custom-logger.service';

@Injectable()
export class CloudStorageService {
  private storage: Storage;
  private bucketName: string;

  constructor(private readonly logger: CustomLoggerService) {
    // Initialize Google Cloud Storage
    if (process.env.NODE_ENV === "development") {
      this.storage = new Storage({
        keyFilename: './starinvoice-2654b9cffc1d.json',
        projectId: "starinvoice"
      });
    }
    else {
      this.storage = new Storage();
    }
    this.bucketName = process.env.GCP_BUCKET || 'inv-images';
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads'
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      //const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
      const fileName = `${folder}/${randomUUID()}-${this.sanitizeFileName(file.originalname)}`;
      const bucket = this.storage.bucket(this.bucketName);
      const fileUpload = bucket.file(fileName);

      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
        //public: true,
        validation: 'md5',
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          this.logger.error(
            `Cloud storage upload failed for ${fileName}: ${error.message}`,
            error.stack,
          );
          reject(new BadRequestException(`Upload failed: ${error.message}`));
        });

        stream.on('finish', async () => {
          try {
            // Make the file public
            //await fileUpload.makePublic();

            // Return the public URL
            const encodedFileName = fileName
              .split('/')
              .map(segment => encodeURIComponent(segment))
              .join('/');
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${encodedFileName}`;
            resolve(publicUrl);
          } catch (error) {
            this.logger.error(
              `Failed to make file public for ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
              error instanceof Error ? error.stack : String(error),
            );
            reject(
              new BadRequestException(
                `Failed to make file public: ${error instanceof Error ? error.message : String(error)}`
              )
            );
          }
        });

        stream.end(file.buffer);
      });
    } catch (error) {
      this.logger.error(
        `Cloud storage upload service error for file ${file?.originalname ?? 'unknown'}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException(`Upload service error: ${error instanceof Error ? error.message : String(error) || error}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract filename from Google Cloud Storage URL
      const fileName = this.extractFileNameFromUrl(fileUrl);
      if (!fileName) {
        throw new BadRequestException('Invalid file URL');
      }

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.delete();
    } catch (error) {
      // Don't throw error if file doesn't exist, just log it
      this.logger.warn(
        `Failed to delete file ${fileUrl}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // True when the URL points at an object under the given folder of our bucket.
  isUnderFolder(fileUrl: string, folder: string): boolean {
    const name = this.extractFileNameFromUrl(fileUrl);
    return !!name && !name.includes('..') && name.startsWith(`${folder}/`);
  }

  // Reads an object back through the service account, so documents stay
  // downloadable even when the bucket itself is not public.
  async downloadFile(fileUrl: string): Promise<Buffer> {
    const fileName = this.extractFileNameFromUrl(fileUrl);
    if (!fileName) throw new BadRequestException('Invalid file URL');
    try {
      const [contents] = await this.storage.bucket(this.bucketName).file(fileName).download();
      return contents;
    } catch (error) {
      this.logger.error(
        `Unable to read file ${fileUrl}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException(
        `Unable to read file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private extractFileNameFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      const bucketIndex = urlParts.indexOf(this.bucketName);
      if (bucketIndex === -1 || bucketIndex === urlParts.length - 1) {
        return null;
      }
      return urlParts
        .slice(bucketIndex + 1)
        .map(segment => decodeURIComponent(segment))
        .join('/');
    } catch {
      return null;
    }
  }

  async isFileValid(file: Express.Multer.File): Promise<boolean> {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
    ];

    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      );
    }

    if (file.size > maxSizeInBytes) {
      throw new BadRequestException(
        'File size too large. Maximum size is 5MB.'
      );
    }

    return true;
  }

  private sanitizeFileName(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();          // ".doc"
    const base = path.basename(originalName, path.extname(originalName));

    const safeBase = base
      .normalize('NFKD')                 // split accented chars
      .replace(/[\u0300-\u036f]/g, '')   // drop diacritics
      .replace(/[^a-zA-Z0-9._-]+/g, '-') // anything unsafe -> "-"
      .replace(/-+/g, '-')               // collapse repeats
      .replace(/^[-.]+|[-.]+$/g, '')     // trim leading/trailing - or .
      .slice(0, 100);                    // keep paths reasonable

    return `${safeBase || 'file'}${ext}`;
  }  
}
