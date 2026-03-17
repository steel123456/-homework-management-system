import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ─── WS 路由注册────────
const wssMap = new Map<string, WebSocketServer>();

function registerWsEndpoint(path: string): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  wssMap.set(path, wss);
  return wss;
}

function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
  const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
  const wss = wssMap.get(pathname);
  if (wss) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else if (!dev) {
    // 生产环境销毁未注册的 upgrade 请求，防止连接泄漏
    // 开发环境不销毁 —— Next.js HMR 需要通过 /_next/webpack-hmr 建立 WebSocket
    socket.destroy();
  }
}

// ─── 注册端点 & 绑定业务逻辑 ──────────────────────
// 作业管理实时通知端点
const notificationsWss = registerWsEndpoint('/ws/notifications');
notificationsWss.on('connection', (ws) => {
  console.log('New WebSocket connection on /ws/notifications');
  
  let alive = true;
  
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      
      // 心跳检测
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', payload: null }));
        return;
      }
      
      // 处理订阅消息
      if (msg.type === 'subscribe') {
        console.log('Client subscribed to:', msg.payload);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  // 心跳机制
  const interval = setInterval(() => {
    if (!alive) {
      ws.terminate();
      return;
    }
    alive = false;
    ws.ping();
  }, 30000);

  ws.on('pong', () => { alive = true; });
  ws.on('close', () => clearInterval(interval));
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  
  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });

  server.on('upgrade', handleUpgrade);

  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.COZE_PROJECT_ENV
      }`,
    );
  });
});
