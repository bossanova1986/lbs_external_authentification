import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(app.get(ConfigService).get<string>('BASE_PATH') ?? '');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
