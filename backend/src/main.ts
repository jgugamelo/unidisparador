import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as express from 'express';

const expressServer = express();

async function createApp() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressServer));

  app.enableCors({ origin: process.env.FRONTEND_URL || '*' });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('WhatsSmart Sender API')
    .setDescription('API para disparo inteligente de mensagens via WhatsApp')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  return app;
}

// ── Local dev (não Vercel) ─────────────────────────────────
if (!process.env.VERCEL) {
  createApp().then(() => {
    const port = process.env.PORT || 3001;
    expressServer.listen(port, () => {
      console.log(`🚀 Backend rodando em http://localhost:${port}`);
      console.log(`📄 Swagger em http://localhost:${port}/api/docs`);
    });
  });
}

// ── Vercel serverless handler ──────────────────────────────
let appInitPromise: Promise<any> | null = null;

function ensureApp() {
  if (!appInitPromise) appInitPromise = createApp();
  return appInitPromise;
}

module.exports = async (req: any, res: any) => {
  await ensureApp();
  expressServer(req, res);
};
