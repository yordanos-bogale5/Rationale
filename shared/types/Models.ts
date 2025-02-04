export {};
export interface Room {
  id: string;
  name: string;
  users: User[];
}

export interface User {
  id: string;
  username: string;
  roomName: string;
}
