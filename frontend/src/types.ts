export interface ScoreData {
  id: string;
  scores: {
    player1: {
      name: string;
      total_time: { total_time: number };
      reactionTimes: number[];
    };
    player2: {
      name: string;
      total_time: { total_time: number };
      reactionTimes: number[];
    };
  };
}
