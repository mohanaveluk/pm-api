import { Controller, Post, Body, UseGuards, UseInterceptors, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { TimeoutInterceptor } from 'src/common/interceptors/timeout.interceptor';

@ApiTags('Contact')
@UseInterceptors(TimeoutInterceptor)
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a contact form' })
  @ApiResponse({ status: 201, description: 'Contact form submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contact records' })
  @ApiResponse({ status: 200, description: 'List of all contact records' })
  findAll() {
    return this.contactService.findAll();
  }
}