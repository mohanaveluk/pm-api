import { ApiProperty } from "@nestjs/swagger";

export class ResponseDto<T> {
  @ApiProperty({
    description: 'Indicates if the operation was successful',
    example: true
  })
  status: boolean;

  @ApiProperty({
    description: 'Message describing the result of the operation',
    example: 'Data created successfully'
  })
  message: string;

  @ApiProperty({
    description: 'The data returned by the operation',
    required: false
  })
  data: T | null;

  @ApiProperty({
    description: 'Error message if the operation failed',
    required: false,
    example: 'Failed to create data'
  })
  error?: string;

  @ApiProperty({ example: new Date().toISOString() })
  timestamp: string;

  constructor(success: boolean, message: string, data: T | null, error?: string) {
    this.status = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message = 'Operation completed successfully'): ResponseDto<T> {
    return new ResponseDto(true, message, data);
  }

  static created<T>(data: T, message = 'Resource created successfully'): ResponseDto<T> {
    return new ResponseDto(true, message, data);
  }

  static updated<T>(data: T, message = 'Resource updated successfully'): ResponseDto<T> {
    return new ResponseDto(true, message, data);
  }

  static deleted(message = 'Resource deleted successfully'): ResponseDto<null> {
    return new ResponseDto(true, message, null);
  }
}