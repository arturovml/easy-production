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
  donePieces: number;
  scrapPieces: number;
  completionPercent: number; // 0..100
  standardMinutesProducedTotal: number;
};
