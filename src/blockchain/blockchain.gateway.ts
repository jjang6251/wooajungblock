// websocket/token.gateway.ts
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { TOKEN_EVENTS } from './blockchain.events';
import { InjectRepository } from '@nestjs/typeorm';
import { Blockchain } from './entity/blockchain.entity';
import { Repository } from 'typeorm';

@WebSocketGateway({
  cors: {
    origin: '*', // 모든 도메인에서의 요청을 허용
    methods: ['GET', 'POST'], // 허용할 HTTP 메서드
    allowedHeaders: ['Content-Type'], // 허용할 HTTP 헤더
    credentials: true // 쿠키를 포함한 요청을 허용
  }
})
export class TokenGateway implements OnGatewayConnection, OnGatewayDisconnect {

  constructor(@InjectRepository(Blockchain) private blockRepository: Repository<Blockchain>) { }

  @WebSocketServer()
  server: Server;

  // 연결된 클라이언트 수 추적
  private connectedClients: number = 0;

  // 토큰 업데이트 전송 메소드 (코드 재사용을 위해 분리)
  private async sendTokenUpdates(client: Socket) {
    const userIds = ['운영자', '권인우', '최윤서'];

    try {
      // 해당 userId를 가진 사용자들의 정보만 조회
      const tokens = await this.blockRepository.find({
        where: userIds.map(userId => ({ userId })),
        select: ['userId', 'token'] // 필요한 필드만 선택
      });

      // 특정 클라이언트에게만 토큰 정보 전송
      client.emit('tokenUpdate', tokens);
      console.log(`초기 토큰 정보가 클라이언트 ${client.id}에게 전송됨`);
    } catch (error) {
      console.error('토큰 정보 조회 중 오류 발생:', error);
    }
  }

  // 클라이언트 연결 시
  async handleConnection(client: Socket) {
    this.connectedClients++;
    console.log(`클라이언트 연결됨: ${client.id}, 현재 연결 수: ${this.connectedClients}`);

    // 클라이언트가 특정 토큰 주제를 구독하도록 할 수 있음
    client.on('subscribeToTokenUpdates', async () => {
      client.join('token-updates');
      console.log(`클라이언트 ${client.id}가 token-updates 룸에 가입함`);

      // 구독 시 바로 현재 토큰 값 전송
      await this.sendTokenUpdates(client);
    });

    // 연결 즉시 토큰 값 전송
    await this.sendTokenUpdates(client);
  }


  // 연결 해제 시
  handleDisconnect(client: Socket) {
    this.connectedClients--;
    console.log(`클라이언트 연결 해제됨: ${client.id}, 현재 연결 수: ${this.connectedClients}`);
  }

  // 토큰 변경 이벤트 리스닝 - 모든 연결된 클라이언트에게 브로드캐스트
  @OnEvent(TOKEN_EVENTS.TOKEN_CHANGED)
  async handleTokenChanged() {
    const userIds = ['운영자', '권인우', '최윤서'];

    // 해당 userId를 가진 사용자들의 정보만 조회
    const tokens = await this.blockRepository.find({
      where: userIds.map(userId => ({ userId })),
      select: ['userId', 'token'] // 필요한 필드만 선택
    });

    // 모든 클라이언트에게 브로드캐스트
    this.server.emit('tokenUpdate', tokens);
    console.log(`토큰 업데이트가 모든 클라이언트에게 브로드캐스트됨: ${tokens}`);

    // 또는 특정 룸에 가입한 클라이언트에게만 브로드캐스트
    // this.server.to('token-updates').emit('tokenUpdate', { token });
  }

  // 토큰 업데이트를 수동으로 트리거할 수 있는 메서드 (서비스에서 직접 호출)
  broadcastTokenUpdate(token: string) {
    this.server.emit('tokenUpdate', { token });
    console.log(`토큰 업데이트가 수동으로 브로드캐스트됨: ${token}`);
  }
}