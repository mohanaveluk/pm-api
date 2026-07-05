import { BadRequestException } from '@nestjs/common';

export const imageFileFilter = (req: any, file: Express.Multer.File, callback: Function) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
    return callback(
      new BadRequestException('Only jpg, jpeg and png files are allowed!'),
      false
    );
  }
  callback(null, true);
};

export const maxFileSize = 5 * 1024 * 1024; // 5MB