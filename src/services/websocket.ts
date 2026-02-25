import { io, Socket } from "socket.io-client";

let socket: Socket;

export function connectSocket(workspaceId: string) {
  socket = io("http://localhost:4000", {
    query: { workspaceId }
  });
  return socket;
}

export function getSocket() {
  return socket;
}