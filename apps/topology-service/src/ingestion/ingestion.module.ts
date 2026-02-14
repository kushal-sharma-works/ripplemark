import { Module } from '@nestjs/common';
import { GraphModule } from '@graph/graph.module';
import { IngestionController } from './ingestion.controller';
import { GraphGateway } from './graph.gateway';

@Module({
  imports: [GraphModule],
  controllers: [IngestionController],
  providers: [GraphGateway],
  exports: [GraphGateway],
})
export class IngestionModule {}
