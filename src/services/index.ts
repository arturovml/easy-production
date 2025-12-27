// Service interfaces / ports

export type OutboxServicePort = {
  enqueue: (payload: unknown) => Promise<string>; // returns event id
};
