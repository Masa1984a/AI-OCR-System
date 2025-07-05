import { ApiProperty } from '@nestjs/swagger';

export class AvailableModelDto {
  @ApiProperty({ example: 'claude-3-5-sonnet-20241022' })
  model: string;

  @ApiProperty({ example: 'Claude 3.5 Sonnet' })
  displayName: string;

  @ApiProperty({ example: 'claude' })
  provider: string;

  @ApiProperty({ example: 'Latest Claude model with enhanced capabilities' })
  description?: string;
}

export class AvailableModelsResponseDto {
  @ApiProperty({ type: [AvailableModelDto] })
  models: AvailableModelDto[];
}