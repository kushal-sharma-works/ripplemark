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
  controllers: [HealthController],
  providers: [PersistenceService, RedisHealthIndicator],
  exports: [PersistenceService, RedisModule],
})
export class InfrastructureModule {}
