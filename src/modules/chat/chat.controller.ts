import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
  BadRequestException,
  Req,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request as ExpRequest } from 'express';
import { ResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import Anthropic from "@anthropic-ai/sdk";


@ApiTags('chat')
@Controller('chat')
export class ChatController {
    constructor(
        // Inject any required services here, e.g., ChatService
        private readonly anthropic: Anthropic, // Replace with actual type of the service
    ) { }

    @Post('request')
    @ApiOperation({
        summary: 'Chat with the survey assistant',
        description: 'Send a message to the survey assistant and receive a response.',
    })
    @ApiBody({
        description: 'Message to send to the survey assistant',
        schema: {
            type: 'object',
            properties: {
                messages: {
                    type: 'string',
                    example: 'What is the current status of my survey?',
                },
            },
            required: ['message'],
        },
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Response from the survey assistant',
        schema: {
            type: 'object', 
            properties: {
                response: {
                    type: 'string',
                    example: 'Your survey is currently published and has received 150 votes.',
                },
            },
        },
    })
    async chat(@Body() body: { messages: any[]; system: string }) {

        const response = await this.anthropic.messages.create({
            model:      'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system:     body.system,
            messages:   body.messages,
        });

        //return new ResponseDto<string>(true, 'Response from survey assistant',response, null);
        return response;
        
    }

}