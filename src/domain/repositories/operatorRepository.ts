import { Operator } from '../../shared/schemas';

export interface OperatorRepository {
  add(op: Operator): Promise<void>;
  getById(id: string): Promise<Operator | undefined>;
  list(): Promise<Operator[]>;
}
