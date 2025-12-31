import { WorkCenter } from '../../shared/schemas';

export interface WorkCenterRepository {
  add(wc: WorkCenter): Promise<void>;
  update(id: string, updates: Partial<WorkCenter>): Promise<void>;
  getById(id: string): Promise<WorkCenter | undefined>;
  list(): Promise<WorkCenter[]>;
}
