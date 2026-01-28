import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SendMessageDto } from './send-message.dto';

export class ScheduleMessageDto extends SendMessageDto {
    @ApiProperty()
    @IsDateString()
    scheduledFor: string;

    @ApiProperty({ required: false, minimum: 0, maximum: 10 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(10)
    maxRetries?: number;
}
