import {
  parseGatewayServerMessage,
  type GatewayServerMessage,
  type StreamEvent
} from '@market-tracker/contracts';

type ClientConnection = {
  id: string;
  send(message: GatewayServerMessage): void;
  ping(): void;
  close(code?: number, reason?: string): void;
};

type ClientRecord = {
  connection: ClientConnection;
  symbols: Set<string>;
  lastPongAt: number;
};

const eventSymbol = (event: StreamEvent): string | undefined => {
  switch (event.type) {
    case 'quote.updated':
    case 'trade.printed':
    case 'bar.closed':
      return event.payload.symbol.ticker;
    default:
      return undefined;
  }
};

export class ClientRegistry {
  private readonly clients = new Map<string, ClientRecord>();

  register(connection: ClientConnection): void {
    this.clients.set(connection.id, {
      connection,
      symbols: new Set<string>(),
      lastPongAt: Date.now()
    });

    connection.send(
      parseGatewayServerMessage({
        type: 'welcome',
        clientId: connection.id,
        connectedAt: new Date().toISOString()
      })
    );
  }

  unregister(clientId: string): void {
    this.clients.delete(clientId);
  }

  getConnectionCount(): number {
    return this.clients.size;
  }

  getClientIds(): string[] {
    return [...this.clients.keys()];
  }

  updateSubscriptions(clientId: string, operation: 'subscribe' | 'unsubscribe', symbols: string[]): string[] {
    const record = this.clients.get(clientId);
    if (!record) {
      return [];
    }

    for (const symbol of symbols) {
      const normalized = symbol.trim().toUpperCase();
      if (!normalized) {
        continue;
      }

      if (operation === 'subscribe') {
        record.symbols.add(normalized);
      } else {
        record.symbols.delete(normalized);
      }
    }

    const updatedSymbols = [...record.symbols].sort();
    record.connection.send(
      parseGatewayServerMessage({
        type: 'subscriptions.updated',
        symbols: updatedSymbols
      })
    );

    return updatedSymbols;
  }

  touchPong(clientId: string): void {
    const record = this.clients.get(clientId);
    if (record) {
      record.lastPongAt = Date.now();
    }
  }

  sendHeartbeat(clientId: string): void {
    const record = this.clients.get(clientId);
    if (!record) {
      return;
    }

    record.connection.send(
      parseGatewayServerMessage({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })
    );
    record.connection.ping();
  }

  getStaleClientIds(timeoutMs: number): string[] {
    const threshold = Date.now() - timeoutMs;
    const stale: string[] = [];

    for (const [clientId, record] of this.clients.entries()) {
      if (record.lastPongAt < threshold) {
        stale.push(clientId);
      }
    }

    return stale;
  }

  dropClient(clientId: string, code?: number, reason?: string): void {
    const record = this.clients.get(clientId);
    if (!record) {
      return;
    }

    record.connection.close(code, reason);
    this.clients.delete(clientId);
  }

  broadcast(event: StreamEvent): number {
    const symbol = eventSymbol(event);
    let delivered = 0;

    for (const record of this.clients.values()) {
      if (symbol && !record.symbols.has(symbol.toUpperCase())) {
        continue;
      }

      record.connection.send(
        parseGatewayServerMessage({
          type: 'stream.event',
          event
        })
      );
      delivered += 1;
    }

    return delivered;
  }
}
