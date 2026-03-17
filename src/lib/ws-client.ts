interface WsMessage<T = unknown> {
  type: string;
  payload: T;
}

interface WsOptions {
  path: string;
  onMessage: (msg: WsMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnect?: boolean;
  heartbeatMs?: number;
}

export function createWsConnection(opts: WsOptions): {
  send: (msg: WsMessage) => void;
  close: () => void;
} {
  // 只在浏览器环境中运行
  if (typeof window === 'undefined') {
    return {
      send: () => {},
      close: () => {},
    };
  }

  const { path, onMessage, onOpen, onClose, reconnect = true, heartbeatMs = 30000 } = opts;
  let ws: WebSocket;
  let heartbeatTimer: ReturnType<typeof setInterval>;
  let closed = false;

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}${path}`);

    ws.onopen = () => {
      heartbeatTimer = setInterval(() => ws.send(JSON.stringify({ type: 'ping', payload: null })), heartbeatMs);
      onOpen?.();
    };

    ws.onmessage = (e) => {
      const msg: WsMessage = JSON.parse(e.data);
      if (msg.type === 'pong') return;
      onMessage(msg);
    };

    ws.onclose = () => {
      clearInterval(heartbeatTimer);
      onClose?.();
      if (reconnect && !closed) setTimeout(connect, 1000);
    };
  }

  connect();

  return {
    send: (msg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg)),
    close: () => {
      closed = true;
      ws.close();
    },
  };
}

export type { WsMessage };
