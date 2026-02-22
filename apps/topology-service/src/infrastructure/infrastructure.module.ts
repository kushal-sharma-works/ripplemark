import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphModule } from '@graph/graph.module';
import { GraphSnapshot, GraphSnapshotSchema } from './schemas';
import { PersistenceService } from './persistence';
import { HealthController, RedisHealthIndicator } from './health';
import { MetricsController } from '@app/observability/metrics.controller';
import { TopologyMetricsService } from '@app/observability/metrics.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GraphSnapshot.name, schema: GraphSnapshotSchema },
    ]),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get('REDIS_URL') || 'redis://localhost:6379',
      }),
    }),
    TerminusModule,
    ScheduleModule.forRoot(),
    GraphModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [PersistenceService, RedisHealthIndicator, TopologyMetricsService],
  exports: [PersistenceService, RedisModule, TopologyMetricsService],
})
export class InfrastructureModule {}
