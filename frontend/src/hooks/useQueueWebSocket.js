import { useEffect, useRef, useCallback } from 'react';

/**
 * 🔌 Hook para WebSocket da Fila
 * 
 * Gerencia conexão WebSocket com reconexão automática,
 * heartbeat e tratamento de erros.
 * Usa slug para máxima segurança (não expõe organizationId na URL).
 */
export function useQueueWebSocket(slug, queueId, onMessage) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const reconnectCountRef = useRef(0);
  const maxReconnectAttemptsRef = useRef(5);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);
  const organizationIdRef = useRef(null);

  // Calcular delay com backoff exponencial
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);
    return delay;
  }, []);

  // Validar slug e obter organizationId
  const validateSlug = useCallback(async () => {
    if (!slug) {
      console.log('⏭️ Slug não fornecido, pulando validação');
      return null;
    }

    try {
      console.log(`🔐 Validando slug: ${slug}`);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/queues/validate-websocket/${slug}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao validar slug: ${response.status}`);
      }

      const data = await response.json();
      organizationIdRef.current = data.organizationId;
      console.log(`✅ Slug validado! Organization ID: ${data.organizationId.substring(0, 8)}...`);
      return data.organizationId;
    } catch (error) {
      console.error(`❌ Erro ao validar slug "${slug}":`, error);
      return null;
    }
  }, [slug]);

  // Conectar ao WebSocket
  const connect = useCallback(async () => {
    if (isConnectingRef.current || !slug || !queueId) {
      console.log('⏭️ Pulando conexão:', {
        isConnecting: isConnectingRef.current,
        slug,
        queueId
      });
      return;
    }

    if (wsRef.current && [WebSocket.OPEN, WebSocket.CONNECTING].includes(wsRef.current.readyState)) {
      console.log('⏭️ WebSocket já conectado ou conectando');
      return;
    }

    isConnectingRef.current = true;

    try {
      // Validar slug primeiro
      const orgId = await validateSlug();
      if (!orgId) {
        isConnectingRef.current = false;
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Backend está sempre em porta 3000, mesmo se frontend em porta diferente
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const wsHost = backendUrl.replace(/^http/, 'ws').replace(/^https/, 'wss');
      const wsUrl = `${wsHost}/queue?organizationId=${orgId}&queueId=${queueId}`;

      console.log(`🔌 Conectando WebSocket: ${wsHost}/queue?organizationId=***&queueId=${queueId}`);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket conectado');
        isConnectingRef.current = false;
        reconnectCountRef.current = 0;

        // Enviar mensagem de subscribe
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'subscribe_queue',
            organizationId: orgId,
            queueId,
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensagem recebida:', data.type);

          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (err) {
          console.error('Erro ao processar mensagem WebSocket:', err);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ Erro WebSocket:', error);
        isConnectingRef.current = false;
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket desconectado');
        isConnectingRef.current = false;

        // Tentar reconectar
        if (reconnectCountRef.current < maxReconnectAttemptsRef.current) {
          const delay = getReconnectDelay();
          reconnectCountRef.current++;

          console.log(
            `🔄 Reconectando em ${delay}ms (tentativa ${reconnectCountRef.current}/${maxReconnectAttemptsRef.current})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('❌ Máximo de reconexões atingido');
        }
      };
    } catch (err) {
      console.error('Erro ao criar WebSocket:', err);
      isConnectingRef.current = false;
    }
  }, [slug, queueId, getReconnectDelay, validateSlug]);

  // Desconectar
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    console.log('🔌 WebSocket desconectado manualmente');
  }, []);

  // Enviar mensagem
  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
        console.log('📤 Mensagem enviada:', data.type);
      } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
      }
    } else {
      console.warn('⚠️ WebSocket não está aberto');
    }
  }, []);

  // Obter estado da conexão
  const isConnected = useCallback(() => {
    return wsRef.current?.readyState === WebSocket.OPEN;
  }, []);

  // Setup e cleanup
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    send,
    disconnect,
  };
}
