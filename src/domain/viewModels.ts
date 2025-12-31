export type StageProgressVM = {
  operationId: string;
  sequence: number;
  donePieces: number;
  scrapPieces: number;
  standardMinutesProduced: number;
};

export type OrderProgressVM = {
  orderId: string;
  targetPieces: number;
  processedPieces: number; // Sum of donePieces across all operations
  completedPieces: number; // donePieces from last operation (max sequence)
  wipPieces: number; // max(stageDone) - completedPieces, clamped >= 0
  scrapPieces: number;
  completionPercent: number; // 0..100 - based on last operation (max sequence)
  avgStageProgress?: number; // Optional: average progress across all stages
  standardMinutesProducedTotal: number;
};
