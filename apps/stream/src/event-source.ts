import type { ProviderHealth, StreamEvent } from '@market-tracker/contracts';

export type StreamEventListener = (event: StreamEvent) => void;

export interface StreamEventSource {
  start(): Promise<void>;
  stop(): Promise<void>;
  onEvent(listener: StreamEventListener): () => void;
  healthCheck(): Promise<ProviderHealth | undefined>;
}
