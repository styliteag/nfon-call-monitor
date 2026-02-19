import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "./useAuth";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [nfonConnected, setNfonConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    const socket = io({
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("nfon:connected", () => setNfonConnected(true));
    socket.on("nfon:disconnected", () => setNfonConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return { socket: socketRef.current, isConnected, nfonConnected, on };
}
