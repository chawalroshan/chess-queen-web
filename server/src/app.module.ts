import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChessService } from './chess.service';
import { ChessGateway } from './chess.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, ChessService, ChessGateway],
})
export class AppModule {}
