import { v4 as uuidv4 } from 'uuid';
import { Operator, OperatorSchema } from '../../shared/schemas';
import { OperatorRepositoryDexie } from '../../data/dexie/operatorRepositoryDexie';

const operatorRepo = new OperatorRepositoryDexie();

export async function fetchOperators(): Promise<Operator[]> {
  return operatorRepo.list();
}

export async function fetchOperatorById(id: string): Promise<Operator | undefined> {
  return operatorRepo.getById(id);
}

export type CreateOperatorInput = {
  name: string;
};

export async function createOperator(input: CreateOperatorInput): Promise<Operator> {
  const operator = OperatorSchema.parse({
    id: uuidv4(),
    name: input.name,
  });
  await operatorRepo.add(operator);
  return operator;
}

export type UpdateOperatorInput = {
  name?: string;
};

export async function updateOperator(id: string, input: UpdateOperatorInput): Promise<void> {
  await operatorRepo.update(id, input);
}

