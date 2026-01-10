import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { API_CONFIG, APP_CONFIG } from '@susmi/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  app.enableCors({
    origin: API_CONFIG.corsOrigins,
    credentials: true,
  });

  // Configurar prefixo global
  app.setGlobalPrefix(API_CONFIG.prefix);

  // Configurar validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle(APP_CONFIG.name)
    .setDescription(APP_CONFIG.description)
    .setVersion(APP_CONFIG.version)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(API_CONFIG.port, '0.0.0.0');
  console.log(`🚀 API rodando em:`);
  console.log(`   • Local: http://localhost:${API_CONFIG.port}${API_CONFIG.prefix}`);
  console.log(`   • Rede: http://192.168.15.4:${API_CONFIG.port}${API_CONFIG.prefix}`);
  console.log(`📚 Documentação disponível em:`);
  console.log(`   • Local: http://localhost:${API_CONFIG.port}/docs`);
  console.log(`   • Rede: http://192.168.15.4:${API_CONFIG.port}/docs`);
}

bootstrap();
