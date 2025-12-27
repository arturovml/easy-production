import create from 'zustand';
import { EventRepositoryDexie } from '../data/dexie/eventRepositoryDexie';
import { WorkEvent } from '../shared/schemas';

interface EventState {
  appendEvent: (e: WorkEvent) => Promise<void>;
  listByAggregate: (aggregateId: string) => Promise<WorkEvent[]>;
}

const eventRepo = new EventRepositoryDexie();

export const useEventStore = create<EventState>(() => ({
  appendEvent: async (e: WorkEvent) => {
    await eventRepo.append(e);
  },
  listByAggregate: async (aggregateId: string) => {
    return eventRepo.listByAggregate(aggregateId);
  }
}));