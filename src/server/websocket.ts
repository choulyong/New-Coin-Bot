import { createServer } from 'http';
import { Server } from 'socket.io';
import { bithumbWs, TickerUpdate, TransactionUpdate } from '../lib/bithumb/websocket';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Bithumb WebSocket 연결
bithumbWs.connect();

// 클라이언트 연결 처리
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 구독 요청 처리
  socket.on('subscribe', (symbols: string[]) => {
    console.log('Subscribe request:', symbols);
    bithumbWs.subscribe(symbols);

    socket.join('market-updates');
  });

  // 구독 해제
  socket.on('unsubscribe', () => {
    bithumbWs.unsubscribe();
    socket.leave('market-updates');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Bithumb 실시간 데이터 → 클라이언트로 전달
bithumbWs.on('ticker', (update: TickerUpdate) => {
  io.to('market-updates').emit('ticker', update);
});

bithumbWs.on('transaction', (update: TransactionUpdate) => {
  io.to('market-updates').emit('transaction', update);
});

// 에러 처리
bithumbWs.on('error', (error) => {
  console.error('Bithumb WebSocket error:', error);
  io.to('market-updates').emit('error', { message: error.message });
});

// WebSocket 재연결
bithumbWs.on('disconnected', () => {
  console.log('Bithumb WebSocket disconnected, will reconnect...');
});

bithumbWs.on('connected', () => {
  console.log('Bithumb WebSocket connected');
});

const PORT = process.env.WS_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  bithumbWs.disconnect();
  httpServer.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});
