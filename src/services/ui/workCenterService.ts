import { v4 as uuidv4 } from 'uuid';
import { WorkCenter, WorkCenterSchema } from '../../shared/schemas';
import { WorkCenterRepositoryDexie } from '../../data/dexie/workCenterRepositoryDexie';

const workCenterRepo = new WorkCenterRepositoryDexie();

export async function fetchWorkCenters(): Promise<WorkCenter[]> {
  return workCenterRepo.list();
}

export async function fetchWorkCenterById(id: string): Promise<WorkCenter | undefined> {
  return workCenterRepo.getById(id);
}

export type CreateWorkCenterInput = {
  name: string;
  type?: string;
};

export async function createWorkCenter(input: CreateWorkCenterInput): Promise<WorkCenter> {
  const workCenter = WorkCenterSchema.parse({
    id: uuidv4(),
    name: input.name,
    type: input.type,
  });
  await workCenterRepo.add(workCenter);
  return workCenter;
}

export type UpdateWorkCenterInput = {
  name?: string;
  type?: string;
};

export async function updateWorkCenter(id: string, input: UpdateWorkCenterInput): Promise<void> {
  await workCenterRepo.update(id, input);
}

