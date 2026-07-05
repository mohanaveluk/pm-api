import { IsEmail, IsNotEmpty, Matches, MinLength } from 'class-validator';
import { ApiProperty } from "@nestjs/swagger";

export class UserQuestionDto {

    @ApiProperty({
        example: 'I would like to inquire about your services...',
        description: 'The question to submit',
    })
    @IsNotEmpty()
    @MinLength(10)
    question: string;

    @ApiProperty({
        example: 'John Doe',
        description: 'Name of the person asking the question',
    })
    @IsNotEmpty()
    @MinLength(3)
    askerName: string;
}