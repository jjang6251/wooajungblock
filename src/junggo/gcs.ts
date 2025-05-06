// src/gcs/gcs.service.ts
import { Storage } from '@google-cloud/storage';
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GCS {
  private storage: Storage;
  private bucketName = 'wooajung';

  constructor() {
    this.storage = new Storage({
      keyFilename: path.join(__dirname, '../../gcp.json'),
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const uuid = uuidv4();
    const blob = bucket.file(uuid + '-' + file.originalname);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
      //public: true, // 중요: 공개 URL 필요시
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    return new Promise<string>((resolve, reject) => {
      blobStream.on('error', (err) => reject(err));

      blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${blob.name}`;
        resolve(publicUrl);
      });

      blobStream.end(file.buffer);
    });
  }

  async deleteFile(publicUrl: string): Promise<void> {
    try {
      const urlPrefix = `https://storage.googleapis.com/${this.bucketName}/`;
      
      if (!publicUrl.startsWith(urlPrefix)) {
        throw new Error('올바르지 않은 GCS public URL입니다.');
      }
  
      // public URL에서 파일 이름 추출
      const fileName = publicUrl.replace(urlPrefix, '');
  
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);
  
      await file.delete();
      console.log(`✅ 파일 삭제 성공: ${fileName}`);
    } catch (error) {
      console.error(`❌ GCS 파일 삭제 실패: ${error.message}`);
      throw new Error(`파일 삭제 실패: ${error.message}`);
    }
  }
}