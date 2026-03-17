'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createWsConnection, WsMessage } from '@/lib/ws-client';

export function useWebSocket(path: string, onMessage: (msg: WsMessage) => void) {
  const connRef = useRef<ReturnType<typeof createWsConnection> | undefined>(undefined);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    connRef.current = createWsConnection({ 
      path, 
      onMessage: (msg) => onMessageRef.current(msg) 
    });
    return () => connRef.current?.close();
  }, [path]);

  const send = useCallback((msg: WsMessage) => {
    connRef.current?.send(msg);
  }, []);

  return { send };
}
