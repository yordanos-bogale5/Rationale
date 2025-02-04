import { ShowHighestScoresParams } from "../../backend/src/types/GameTypes";

export interface ClientToServerEvents {
  registerUser: (data: { username: string }) => void;
  virusClicked: (data: {
    reactionTime: number;
    iteration: number;
    userId: string;
  }) => void;
  requestNewVirusPosition: () => void;
  saveData: () => void;
  storeTotalReactionTime: (data: { reactionTimes: number[] }) => void;
}

export interface gameDataInterface {
  my_time: string;
  opp_time: number;
  opp_total_time: string;
  opponentIteration?: number;
}

export interface ServerToClientEvents {
  virusPosition: (position: { x: number; y: number }) => void;
  waitingLobby: () => void;
  gameStarting: (data: { opponentName: string }) => void;
  error: (message: string | string[]) => void;
  success: (message: string | string[]) => void;
  onGameInformationUpdated: (data: gameDataInterface) => void;
  userId: (userId: string) => void;
  showHighestScores: ({
    last10Matches,
    highestScorer,
  }: ShowHighestScoresParams) => void;
}
