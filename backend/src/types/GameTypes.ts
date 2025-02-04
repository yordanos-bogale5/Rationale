export interface TotalTime {
	id: string;
	userId: string;
	total_time: number;
}

export interface Player {
	id: string;
	reactionTimes: number[];
	total_time: TotalTime;
}

interface PlayerScore {
	name: string;
	id: string;
	reactionTimes: number[];
	total_time: TotalTime;
}

export interface Scores {
	player1: PlayerScore;
	player2: PlayerScore;
}

export interface MatchScore {
	name: string;
	id: string;
	scores: Scores;
	createdAt: string;
}

export interface HighestScorer {
	playerId: string;
	name: string;
	averageReactionTime: number;
}

export interface ShowHighestScoresParams {
	last10Matches: MatchScore[];
	highestScorer: HighestScorer;
}
