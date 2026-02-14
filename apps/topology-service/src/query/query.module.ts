import { Module } from '@nestjs/common';
import { GraphModule } from '@graph/graph.module';
import { QueryController } from './query.controller';

@Module({
  imports: [GraphModule],
  controllers: [QueryController],
})
export class QueryModule {}
