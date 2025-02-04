const elements = {
  userForm: document.querySelector<HTMLFormElement>("#user-form"),
  usernameInput: document.querySelector<HTMLInputElement>("#username"),
  startGameButton:
    document.querySelector<HTMLButtonElement>("#start-game-button"),
  canvas: document.querySelector<HTMLDivElement>("#canvas"),
  canvasParent: document.querySelector<HTMLDivElement>("#canvas_parent"),
  welcomeMessage: document.querySelector<HTMLDivElement>("#welcome-message"),
  waitingLobby: document.querySelector<HTMLDivElement>("#waiting-lobby"),
  gameOn: document.querySelector<HTMLDivElement>("#game-on"),
  startView: document.querySelector<HTMLDivElement>("#start-view"),
  oppName: document.getElementById("opp_name") as HTMLSpanElement | null,
  myIteration: document.getElementById(
    "my_iteration"
  ) as HTMLSpanElement | null,
  oppIteration: document.getElementById(
    "opp_iteration"
  ) as HTMLSpanElement | null,
  myTime: document.getElementById("my_time") as HTMLSpanElement | null,
  myTotalTime: document.getElementById(
    "my_total_time"
  ) as HTMLSpanElement | null,
  oppTime: document.getElementById("opp_time") as HTMLSpanElement | null,
  oppTotalTime: document.getElementById(
    "opp_total_time"
  ) as HTMLSpanElement | null,
  gameResults: document.querySelector<HTMLDivElement>("#game-results"),
  last10GamesResults: document.getElementById("show-latest-ten-matches"),
  last10GamesTitle: document.getElementById("ten-latest"),
  fastestPlayer: document.getElementById("fastest-player"),
};

export default elements;
