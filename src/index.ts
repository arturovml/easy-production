export const projectVersion = '0.1.0';

export { db } from './infra/dexie/db';
export { seedDemoData } from './seeds/seedDemoData';
export * from './shared/schemas';

// Aggregation services
export * from './domain/services/aggregation';
export * from './domain/viewModels';
export * from './domain/policies';
