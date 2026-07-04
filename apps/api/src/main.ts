import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Wszystkie endpointy pod /api
  app.setGlobalPrefix("api");

  // Walidacja DTO + odcinanie nadmiarowych pól (bezpieczeństwo)
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // CORS dla frontu (panel admina + PWA). WEB_ORIGIN może być hostem bez schematu
  // (Render podaje host) — normalizujemy do https://.
  const origins = (process.env.WEB_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .map((o) => (o.startsWith("http") ? o : `https://${o}`));
  app.enableCors({ origin: origins, credentials: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`✅ API działa: http://localhost:${port}/api`);
}

bootstrap();
