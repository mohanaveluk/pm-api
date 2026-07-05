import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import Anthropic from '@anthropic-ai/sdk';


@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [ChatController],
  providers: [Anthropic],
  exports: [],
})
export class ChatModule {}