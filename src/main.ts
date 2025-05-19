import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { EnvVar } from './common/config/config.instances';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
// import express from 'express';
async function bootstrap() {
  const port = EnvVar.getInstance.PORT;
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['log', 'error', 'warn', 'debug', 'verbose'], // Enable specific log levels
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.enableCors({
    methods: 'GET,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  const config = new DocumentBuilder()
    .setTitle(' WaterMonitoring API')
    .setDescription('this is the documentation for the  WaterMonitoring API')
    .setVersion('1.0')
    .addTag('version one')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
  // Create MQTT microservice
  const mqttMicroservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: 'mqtts://f54dfe3938d04e29930a0c7e39926c8a.s1.eu.hivemq.cloud:8883', // change if using a remote broker
      username: 'mikias',
      password: 'Mayy@1234',
    },
  });

  // Start both HTTP and MQTT
  await app.startAllMicroservices();
  await app.listen(port);
  console.log(` server started Check docs@  http://localhost:${port}/swagger`);
}

bootstrap();
