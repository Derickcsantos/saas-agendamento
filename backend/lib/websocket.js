import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🔌 Gerenciador WebSocket para Fila em Tempo Real
 * 
 * Arquitetura para suportar 100k+ usuários simultâneos:
 * - Organização como namespace principal
 * - Fila como sub-namespace
 * - Conexões indexadas por clientId para rápido lookup
 * - Broadcast eficiente com Message Objects pré-formatados
 */

class QueueWebSocketManager {
  constructor(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/queue', // Aceitar conexões em /queue
      maxPayload: 1024 * 100, // 100KB max por mensagem
      perMessageDeflate: {
        zlevel: 3, // Compressão leve
        memLevel: 7,
      }
    });

    // Estrutura: { organizationId: { queueId: { clientId: ws } } }
    this.connections = {};
    
    // Stats para monitoramento
    this.stats = {
      totalConnections: 0,
      messagesSent: 0,
      messageCount: 0,
    };

    // Heartbeat interval (30s)
    this.heartbeatInterval = 30000;
    this.setupHeartbeat();
    this.setupConnections();
  }

  /**
   * Setup conexões WebSocket
   */
  setupConnections() {
    this.wss.on('connection', (ws, req) => {
      // Extrair organizationId e queueId da URL
      const url = new URL(req.url, `http://${req.headers.host}`);
      const organizationId = url.searchParams.get('organizationId');
      const queueId = url.searchParams.get('queueId');
      const clientId = uuidv4();

      if (!organizationId || !queueId) {
        ws.close(1008, 'Parâmetros obrigatórios faltando');
        return;
      }

      // Inicializar estrutura se necessário
      if (!this.connections[organizationId]) {
        this.connections[organizationId] = {};
      }
      if (!this.connections[organizationId][queueId]) {
        this.connections[organizationId][queueId] = {};
      }

      // Armazenar conexão
      this.connections[organizationId][queueId][clientId] = ws;
      ws.clientId = clientId;
      ws.organizationId = organizationId;
      ws.queueId = queueId;
      ws.isAlive = true;

      this.stats.totalConnections++;

      console.log(
        `✅ WebSocket conectado - Org: ${organizationId}, Fila: ${queueId}, ` +
        `Cliente: ${clientId.substring(0, 8)}, Total: ${this.stats.totalConnections}`
      );

      // Enviar confirmação de conexão
      this.sendToClient(ws, {
        type: 'connection_established',
        clientId,
        timestamp: new Date().toISOString(),
      });

      // Listeners
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleClientMessage(ws, message);
        } catch (err) {
          console.error('Erro ao processar mensagem WebSocket:', err);
          this.sendToClient(ws, {
            type: 'error',
            message: 'Formato de mensagem inválido',
          });
        }
      });

      ws.on('error', (err) => {
        console.error(`❌ Erro WebSocket [${clientId.substring(0, 8)}]:`, err.message);
      });

      ws.on('close', () => {
        delete this.connections[organizationId][queueId][clientId];
        
        // Limpar estrutura vazia
        if (Object.keys(this.connections[organizationId][queueId]).length === 0) {
          delete this.connections[organizationId][queueId];
        }
        if (Object.keys(this.connections[organizationId]).length === 0) {
          delete this.connections[organizationId];
        }

        this.stats.totalConnections--;
        console.log(
          `🔌 WebSocket desconectado - Org: ${organizationId}, Fila: ${queueId}, ` +
          `Cliente: ${clientId.substring(0, 8)}, Total: ${this.stats.totalConnections}`
        );
      });
    });
  }

  /**
   * Heartbeat para detectar conexões mortas
   */
  setupHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, this.heartbeatInterval);
  }

  /**
   * Enviar mensagem para um cliente específico
   */
  sendToClient(ws, data) {
    if (ws.readyState === 1) { // 1 = OPEN
      try {
        ws.send(JSON.stringify(data));
        this.stats.messagesSent++;
      } catch (err) {
        console.error('Erro ao enviar para cliente:', err);
      }
    }
  }

  /**
   * Broadcast para fila específica
   */
  broadcastToQueue(organizationId, queueId, data, excludeClientId = null) {
    if (!this.connections[organizationId]?.[queueId]) {
      return 0;
    }

    let count = 0;
    const msgStr = JSON.stringify(data);
    
    Object.entries(this.connections[organizationId][queueId]).forEach(([clientId, ws]) => {
      if (excludeClientId && clientId === excludeClientId) return;
      
      if (ws.readyState === 1) { // 1 = OPEN
        try {
          ws.send(msgStr);
          count++;
        } catch (err) {
          console.error(`Erro ao broadcast para ${clientId}:`, err);
        }
      }
    });

    this.stats.messageCount += count;
    return count;
  }

  /**
   * Broadcast para organização inteira (todas as filas)
   */
  broadcastToOrganization(organizationId, data) {
    if (!this.connections[organizationId]) {
      return 0;
    }

    let count = 0;
    const msgStr = JSON.stringify(data);

    Object.values(this.connections[organizationId]).forEach((queueClients) => {
      Object.values(queueClients).forEach((ws) => {
        if (ws.readyState === 1) { // 1 = OPEN
          try {
            ws.send(msgStr);
            count++;
          } catch (err) {
            console.error('Erro ao broadcast para organização:', err);
          }
        }
      });
    });

    this.stats.messageCount += count;
    return count;
  }

  /**
   * Manipular mensagens do cliente
   */
  handleClientMessage(ws, message) {
    const { type } = message;

    console.log(`📨 Mensagem recebida [${type}] de ${ws.clientId.substring(0, 8)}`);

    switch (type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;

      case 'subscribe_queue':
        // Cliente pode se inscrever em múltiplas filas (não necessário aqui, mas útil)
        this.sendToClient(ws, {
          type: 'subscribed',
          organizationId: ws.organizationId,
          queueId: ws.queueId,
        });
        break;

      default:
        console.warn(`⚠️ Tipo de mensagem desconhecido: ${type}`);
    }
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    const stats = {
      totalConnections: this.stats.totalConnections,
      messagesSent: this.stats.messagesSent,
      messageCount: this.stats.messageCount,
      organizationCount: Object.keys(this.connections).length,
      queuesPerOrganization: {},
    };

    Object.entries(this.connections).forEach(([orgId, queues]) => {
      stats.queuesPerOrganization[orgId] = {
        queueCount: Object.keys(queues).length,
        connectionsPerQueue: {},
      };

      Object.entries(queues).forEach(([queueId, clients]) => {
        stats.queuesPerOrganization[orgId].connectionsPerQueue[queueId] = 
          Object.keys(clients).length;
      });
    });

    return stats;
  }

  /**
   * Limpar recursos
   */
  close() {
    this.wss.close();
    console.log('🔐 WebSocket Manager fechado');
  }
}

export default QueueWebSocketManager;
