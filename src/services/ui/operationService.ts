import { v4 as uuidv4 } from 'uuid';
import { Operation, OperationSchema } from '../../shared/schemas';
import { OperationRepositoryDexie } from '../../data/dexie/operationRepositoryDexie';

const operationRepo = new OperationRepositoryDexie();

export async function fetchOperations(): Promise<Operation[]> {
  return operationRepo.list();
}

export async function fetchOperationById(id: string): Promise<Operation | undefined> {
  return operationRepo.getById(id);
}

export type CreateOperationInput = {
  name: string;
  operationCode: string;
  samMinutes: number;
  qualityGate?: boolean;
};

export async function createOperation(input: CreateOperationInput): Promise<Operation> {
  const operation = OperationSchema.parse({
    id: uuidv4(),
    code: input.operationCode,
    name: input.name,
    durationMinutes: input.samMinutes,
    qualityGate: input.qualityGate ?? false,
  });
  await operationRepo.add(operation);
  return operation;
}

export type UpdateOperationInput = {
  name?: string;
  operationCode?: string;
  samMinutes?: number;
  qualityGate?: boolean;
};

export async function updateOperation(id: string, input: UpdateOperationInput): Promise<void> {
  const updates: Partial<Operation> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.operationCode !== undefined) updates.code = input.operationCode;
  if (input.samMinutes !== undefined) updates.durationMinutes = input.samMinutes;
  if (input.qualityGate !== undefined) updates.qualityGate = input.qualityGate;
  await operationRepo.update(id, updates);
}

