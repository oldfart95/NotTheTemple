import type { ApiRepository } from './repository';
import { fixtureProfiles, fixtureSymbols } from '../fixtures/catalog';

export const seedDevelopmentData = async (repository: ApiRepository): Promise<void> => {
  await repository.seedMetadata(fixtureSymbols, fixtureProfiles);
  await repository.seedWatchlist({
    id: 'watchlist-tech-core',
    name: 'Tech Core',
    isDefault: true,
    symbols: ['AAPL', 'MSFT', 'NVDA']
  });
  await repository.seedWatchlist({
    id: 'watchlist-macro',
    name: 'Macro',
    symbols: ['BTC/USD', 'EUR/USD']
  });
};
