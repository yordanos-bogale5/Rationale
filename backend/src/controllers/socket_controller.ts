import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import {
	ClientToServerEvents,
	ServerToClientEvents,
} from "@shared/types/SocketTypes";
import { io } from "../../server";
import { MatchScore, HighestScorer, Scores } from "../types/GameTypes";
import getRandomPosition from "./helper/randomPosition";

const prisma = new PrismaClient();
const socketIdToUsername: Map<string, { username: string; id: string }> =
	new Map();
const roomToWaitingUsers: Map<string, Set<string>> = new Map();

const gameRoomPostions: Map<string, { x: number; y: number }[]> = new Map();

const findOrCreateRoom = async () => {
	const rooms = await prisma.room.findMany({
		include: {
			users: true,
		},
	});
	const availableRoom = rooms.find((room) => room.users.length < 2);
	if (availableRoom) {
		return availableRoom;
	} else {
		const newRoom = await prisma.room.create({
			data: { name: `room-${Date.now()}` },
		});
		return newRoom;
	}
};

const findSocketRooms = (socketId: string) => {
	const socket = io.sockets.sockets.get(socketId);
	if (socket) {
		const rooms = Array.from(socket.rooms).filter(
			(room) => room !== socketId
		);
		return rooms;
	} else {
		return [];
	}
};

const findConnectedClientsInARoom = async (roomId: string, socket: Socket) => {
	const clients = io.sockets.adapter.rooms.get(roomId);
	const clientArray = Array.from((clients as Set<string>) || []);
	const opponentSocketId = clientArray.find((id) => id !== socket.id);
	const opponentData = socketIdToUsername.get(opponentSocketId as string);

	const currentUserData = socketIdToUsername.get(socket.id);

	const opponentUser = await prisma.user.findUnique({
		where: { username: opponentData?.username },
	});
	const currentUser = await prisma.user.findUnique({
		where: { username: currentUserData?.username },
	});
	const currentUserTotalTime = await prisma.total_time.findUnique({
		where: { userId: currentUserData?.id },
	});
	const currentUserReactionTime = await prisma.reaction_times.findUnique({
		where: { userId: currentUserData?.id },
	});

	const opponentTotalTime = await prisma.total_time.findUnique({
		where: { userId: opponentData?.id },
	});
	const opponentReactionTime = await prisma.reaction_times.findUnique({
		where: { userId: opponentData?.id },
	});

	return {
		opponentUser,
		opponentSocketId,
		opponentTotalTime,
		opponentReactionTime:
			opponentReactionTime?.reactiontimes[
				opponentReactionTime.reactiontimes.length - 1 || 0
			],
		opponentIteration: currentUserReactionTime?.reactiontimes?.length
			? currentUserReactionTime.reactiontimes.length + 1
			: 1,
		currentUser,
		currentUserTotalTime,
		currentUserReactionTime: currentUserReactionTime?.reactiontimes,
		opponentAllReactionTime: opponentReactionTime?.reactiontimes,
	};
};

export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	const sendGameData = async (
		roomId: string,
		reactionTime?: number,
		userId?: string
	) => {
		if (userId && reactionTime) {
			const updatedReactionTime = await prisma.reaction_times.upsert({
				where: { userId },
				update: {
					reactiontimes: {
						push: reactionTime,
					},
				},
				create: {
					userId,
					reactiontimes: [reactionTime],
				},
			});

			const updatedTotalTime = await prisma.total_time.upsert({
				where: { userId },
				update: {
					total_time: {
						set: (
							parseFloat(
								(
									await prisma.total_time.findUnique({
										where: { userId },
									})
								)?.total_time || "0"
							) + reactionTime
						).toString(),
					},
				},
				create: {
					userId,
					total_time: reactionTime.toString(),
				},
			});
			const {
				opponentSocketId,
				opponentTotalTime,
				opponentReactionTime,
				currentUserTotalTime,
				opponentIteration,
			} = await findConnectedClientsInARoom(roomId, socket);

			const myreactionTime =
				updatedReactionTime.reactiontimes[
					updatedReactionTime.reactiontimes.length - 1 || 0
				];

			socket.emit("onGameInformationUpdated", {
				opp_time: opponentReactionTime as number,
				opp_total_time: opponentTotalTime?.total_time || "0",
				my_time: updatedTotalTime?.total_time || "0",
			});

			io.to(opponentSocketId as string).emit("onGameInformationUpdated", {
				opp_time: myreactionTime,
				opp_total_time: currentUserTotalTime?.total_time || "0",
				my_time: opponentTotalTime?.total_time || "0",
				opponentIteration,
			});
		}
	};

	async function getLast10Matches() {
		const last10Matches = await prisma.game_result.findMany({
			orderBy: { createdAt: "desc" },
			take: 10,
		});

		const playerIds = new Set<string>();
		last10Matches.forEach((match) => {
			const scores = match.scores as unknown as Scores;
			playerIds.add(scores.player1.id);
			playerIds.add(scores.player2.id);
		});

		const players = await prisma.user.findMany({
			where: {
				id: { in: Array.from(playerIds) },
			},
		});

		const playerMap = Object.fromEntries(
			players.map((player) => [player.id, player.username])
		);

		const matchesWithPlayerNames = last10Matches.map((match) => {
			const scores = match.scores as unknown as Scores;
			return {
				...match,
				scores: {
					player1: {
						...scores.player1,
						name: playerMap[scores.player1.id],
					},
					player2: {
						...scores.player2,
						name: playerMap[scores.player2.id],
					},
				},
			};
		});

		return matchesWithPlayerNames;
	}

	async function getHighestScorerByReactionTime() {
		const reactionTimes = await prisma.reaction_times.findMany({
			select: {
				userId: true,
				reactiontimes: true,
			},
		});

		let topScorerId = null;
		let minAverageReactionTime = Infinity;

		reactionTimes.forEach((record) => {
			const { userId, reactiontimes } = record;
			const averageTime =
				reactiontimes.reduce((a, b) => a + b, 0) / reactiontimes.length;

			if (averageTime < minAverageReactionTime) {
				minAverageReactionTime = averageTime;
				topScorerId = userId;
			}
		});

		let playerName = null;
		if (topScorerId) {
			const topScorer = await prisma.user.findUnique({
				where: { id: topScorerId },
				select: { username: true },
			});
			playerName = topScorer?.username || null;
		}

		return {
			playerId: topScorerId,
			name: playerName,
			averageReactionTime: minAverageReactionTime.toFixed(3),
		};
	}

	socket.on("registerUser", async (data: { username: string }) => {
		const { username } = data;

		try {
			const room = await findOrCreateRoom();
			const existingUser = await prisma.user.findUnique({
				where: { username },
			});

			if (existingUser) {
				socketIdToUsername.set(socket.id, {
					username,
					id: existingUser?.id as string,
				});
				socket.emit("userId", existingUser?.id as string);
				await prisma.user.update({
					where: { id: existingUser.id },
					data: {
						points: 0,
					},
				});
				await prisma.reaction_times.update({
					where: { userId: existingUser.id },
					data: {
						reactiontimes: [],
					},
				});
				await prisma.total_time.update({
					where: { userId: existingUser.id },
					data: {
						total_time: "0",
					},
				});
			}

			if (!existingUser) {
				const newUser = await prisma.user.create({
					data: {
						username,
						room: { connect: { id: room.id } },
					},
				});
				socket.emit("userId", newUser?.id as string);
				socketIdToUsername.set(socket.id, {
					username,
					id: newUser?.id as string,
				});
			}

			if (!roomToWaitingUsers.has(room.id)) {
				roomToWaitingUsers.set(room.id, new Set());
			}

			roomToWaitingUsers.get(room.id)?.add(socket.id);
			const clients = io.sockets.adapter.rooms.get(room.id);
			if (!clients || clients.size < 2) {
				socket.join(room.id);
			}

			if (clients && clients.size === 2) {
				const clientArray = Array.from((clients as Set<string>) || []);
				const opponentSocketId = clientArray.find(
					(id) => id !== socket.id
				);
				const opponentData = socketIdToUsername.get(
					opponentSocketId as string
				);

				const currentUserData = socketIdToUsername.get(socket.id);

				socket.emit("gameStarting", {
					opponentName: opponentData?.username as string,
				});

				io.to(opponentSocketId as string).emit("gameStarting", {
					opponentName: currentUserData?.username as string,
				});
			}

			const waitingUsers = roomToWaitingUsers.get(room.id);
			if (waitingUsers && waitingUsers.size === 2) {
				const canvasWidth = 500;
				const canvasHeight = 400;

				const positions = Array.from(Array(10).keys()).map(() =>
					getRandomPosition(canvasWidth, canvasHeight)
				);
				gameRoomPostions.set(room.id, positions);
				socket.emit("virusPosition", positions[0]);
				socket.to(room.id).emit("virusPosition", positions[0]);
			} else {
				socket.emit("waitingLobby");
			}
		} catch (error) {
			console.error("Error registering user:", error);
			socket.emit("error", "An error occurred during registration.");
		}
	});

	socket.on("virusClicked", async ({ reactionTime, iteration, userId }) => {
		const room = findSocketRooms(socket.id)[0];
		if (!room) return;
		const allPostions = gameRoomPostions.get(room);

		if (allPostions) {
			socket.emit("virusPosition", allPostions[iteration]);
			sendGameData(room, reactionTime, userId);
		}
	});

	socket.on("disconnect", async () => {
		const room = await findOrCreateRoom();
		const waitingUsers = roomToWaitingUsers.get(room.id);
		if (waitingUsers) {
			waitingUsers.delete(socket.id);
			if (waitingUsers.size === 0) {
				roomToWaitingUsers.delete(socket.id);
			}
		}
		socketIdToUsername.delete(socket.id);
	});

	socket.on("saveData", async () => {
		const room = findSocketRooms(socket.id)[0];
		const {
			currentUser,
			opponentUser,
			opponentTotalTime,
			currentUserTotalTime,
			currentUserReactionTime,
			opponentAllReactionTime,
		} = await findConnectedClientsInARoom(room, socket);

		await prisma.game_result.create({
			data: {
				scores: {
					player1: {
						id: currentUser?.id,
						reactionTimes: currentUserReactionTime,
						total_time: currentUserTotalTime,
					},
					player2: {
						id: opponentUser?.id,
						reactionTimes: opponentAllReactionTime,
						total_time: opponentTotalTime,
					},
				},
				createdAt: new Date(),
			},
		});

		const last10Matches = await getLast10Matches();
		const highestScorer = await getHighestScorerByReactionTime();

		socket.emit("showHighestScores", {
			last10Matches: last10Matches as unknown as MatchScore[],
			highestScorer: highestScorer as unknown as HighestScorer,
		});
	});
};
