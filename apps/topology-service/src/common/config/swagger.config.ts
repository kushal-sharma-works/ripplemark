import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Topology Service API')
    .setDescription(
      'Real-time service dependency graph management API. ' +
      'Provides endpoints for registering services and dependencies, ' +
      'querying the dependency graph, and real-time updates via WebSocket.',
    )
    .setVersion('1.0')
    .addTag('ingestion', 'Service and dependency registration endpoints')
    .addTag('query', 'Graph query and analysis endpoints')
    .addTag('health', 'Health check endpoints')
    .addServer('http://localhost:3001', 'Local development')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Topology Service API Documentation',
  });
}
