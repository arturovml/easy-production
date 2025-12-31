import { v4 as uuidv4 } from 'uuid';
import { RoutingVersion, RoutingVersionSchema, RoutingOperation, RoutingOperationSchema } from '../../shared/schemas';
import { RoutingRepositoryDexie } from '../../data/dexie/routingRepositoryDexie';
import { ProductRepositoryDexie } from '../../data/dexie/productRepositoryDexie';
import { OperationRepositoryDexie } from '../../data/dexie/operationRepositoryDexie';

const routingRepo = new RoutingRepositoryDexie();
const productRepo = new ProductRepositoryDexie();
const operationRepo = new OperationRepositoryDexie();

export async function fetchRoutingVersionsByProduct(productId: string): Promise<RoutingVersion[]> {
  return routingRepo.listRoutingVersionsByProduct(productId);
}

export async function fetchRoutingVersionById(id: string): Promise<RoutingVersion | undefined> {
  return routingRepo.getRoutingVersionById(id);
}

export async function fetchRoutingOperationsByVersion(routingVersionId: string): Promise<RoutingOperation[]> {
  return routingRepo.listRoutingOperationsByVersion(routingVersionId);
}

export type CreateRoutingVersionInput = {
  productId: string;
};

export async function createRoutingVersion(input: CreateRoutingVersionInput): Promise<RoutingVersion> {
  // Get existing versions to determine next version number
  const existingVersions = await routingRepo.listRoutingVersionsByProduct(input.productId);
  const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map((v) => v.version)) + 1 : 1;

  const routingVersion = RoutingVersionSchema.parse({
    id: uuidv4(),
    productId: input.productId,
    version: nextVersion,
    createdAt: new Date().toISOString(),
    isDraft: true,
  });
  await routingRepo.addRoutingVersion(routingVersion);
  return routingVersion;
}

export type AddRoutingOperationInput = {
  routingVersionId: string;
  operationId: string;
  standardMinutesOverride?: number;
  workCenterIdOverride?: string;
};

export async function addRoutingOperation(input: AddRoutingOperationInput): Promise<RoutingOperation> {
  // Get existing operations to determine next sequence
  const existingOps = await routingRepo.listRoutingOperationsByVersion(input.routingVersionId);
  const nextSequence = existingOps.length > 0 ? Math.max(...existingOps.map((op) => op.sequence)) + 1 : 1;

  const routingOperation = RoutingOperationSchema.parse({
    id: uuidv4(),
    routingVersionId: input.routingVersionId,
    operationId: input.operationId,
    sequence: nextSequence,
    standardMinutesOverride: input.standardMinutesOverride,
    workCenterIdOverride: input.workCenterIdOverride,
  });
  await routingRepo.addRoutingOperation(routingOperation);
  return routingOperation;
}

export type UpdateRoutingOperationInput = {
  sequence?: number;
  standardMinutesOverride?: number;
  workCenterIdOverride?: string;
};

export async function updateRoutingOperation(id: string, input: UpdateRoutingOperationInput): Promise<void> {
  await routingRepo.updateRoutingOperation(id, input);
}

export async function deleteRoutingOperation(id: string): Promise<void> {
  await routingRepo.deleteRoutingOperation(id);
}

export async function reorderRoutingOperations(
  routingVersionId: string,
  operationIds: string[]
): Promise<void> {
  const operations = await routingRepo.listRoutingOperationsByVersion(routingVersionId);
  if (operations.length !== operationIds.length) {
    throw new Error('Operation count mismatch');
  }

  // Update sequences
  for (let i = 0; i < operationIds.length; i++) {
    const op = operations.find((o) => o.id === operationIds[i]);
    if (op) {
      await routingRepo.updateRoutingOperation(op.id, { sequence: i + 1 });
    }
  }
}

export async function publishRoutingVersion(routingVersionId: string): Promise<void> {
  const version = await routingRepo.getRoutingVersionById(routingVersionId);
  if (!version) {
    throw new Error('Routing version not found');
  }
  if (!version.isDraft) {
    throw new Error('Version is already published');
  }

  // Mark version as published
  await routingRepo.updateRoutingVersion(routingVersionId, { isDraft: false });

  // Update product's active routing version
  await productRepo.update(version.productId, { activeRoutingVersionId: routingVersionId });
}

