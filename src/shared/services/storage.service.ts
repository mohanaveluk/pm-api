import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private storage1: Storage;
  private storage: Storage;
  private bucket: string;

  constructor(private configService: ConfigService) {
    
    this.storage = new Storage({
        keyFilename: './starinvoice-survey-3da387d831dc.json',
        projectId: "starinvoice"
    });
    this.bucket = this.configService.get('GOOGLE_CLOUD_BUCKET');
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    //const encryptionService = new EncryptionService();

    //const skey = encryptionService.generateSecureKey();

    // Encrypt
    //const pkey1 = this.configService.get('GOOGLE_CLOUD_PRIVATE_KEY1'); //?.replace(/\\n/g, '\n');
    const pxkey = this.configService.get('GOOGLE_CLOUD_PRIVATE_KEYP');
    const sxkey = this.configService.get('GOOGLE_CLOUD_PRIVATE_KEYS');
    const pkey = `${pxkey}${this.configService.get('GOOGLE_CLOUD_PRIVATE_KEY')}${sxkey}`?.replace(/\\n/g, '\n');
    //const encrypted = await encryptionService.encrypt(pkey1);
    //const decrypted = await encryptionService.decrypt(encrypted);
    ///const decrypted = await encryptionService.decrypt(pkey);
    //const prkey = `-----BEGIN PRIVATE KEY-----\n${decrypted}\n-----END PRIVATE KEY-----\n`
    //console.log(decrypted);

    this.storage1 = new Storage({
      projectId: this.configService.get('GOOGLE_CLOUD_PROJECT_ID'),
      credentials: {
        client_email: this.configService.get('GOOGLE_CLOUD_CLIENT_EMAIL'),
        private_key: pkey,
      },
    });


    const bucket = this.storage.bucket(this.bucket);
    const blob = bucket.file(`user-profiles/${Date.now()}-${file.originalname}`);
    
    const stream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false,
    });

    return await new Promise((resolve, reject) => {
      stream.on('error', (err) => {
        reject(err);
      });

      stream.on('finish', async () => {
        await blob.makePublic();
        resolve(blob.publicUrl());
      });

      stream.end(file.buffer);
    });
  }
}