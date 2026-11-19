import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ChessService } from './chess.service';
import { ChessGateway } from './chess.gateway';
import { Server } from 'socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const httpServer = app.getHttpServer();
  const io = new Server(httpServer, { cors: { origin: true, credentials: true } });
  const chessService = app.get(ChessService);
  const gateway = new ChessGateway(chessService);
  gateway.attach(io);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
