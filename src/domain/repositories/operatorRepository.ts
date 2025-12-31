import { Operator } from '../../shared/schemas';

export interface OperatorRepository {
  add(op: Operator): Promise<void>;
  update(id: string, updates: Partial<Operator>): Promise<void>;
  getById(id: string): Promise<Operator | undefined>;
  list(): Promise<Operator[]>;
}
