import { useEffect } from "react";
import { connectSocket } from "../../services/websocket";

export function usePresence(workspaceId: string) {
  useEffect(() => {
    const socket = connectSocket(workspaceId);

    socket.emit("join");

    return () => {
      socket.disconnect();
    };
  }, [workspaceId]);
}