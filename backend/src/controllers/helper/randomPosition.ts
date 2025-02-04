const getRandomPosition = (canvasWidth: number, canvasHeight: number) => {
	const virusWidth = 50;
	const virusHeight = 50;
	const maxX = canvasWidth - virusWidth;
	const maxY = canvasHeight - virusHeight;
	const x = Math.floor(Math.random() * (maxX + 1));
	const y = Math.floor(Math.random() * (maxY + 1));
	return { x, y };
};

export default getRandomPosition;
