import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Connect to backend WebSocket server
    const newSocket = io("http://localhost:3000", {
      auth: {
        token: localStorage.getItem("token"),
      },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setConnected(true);
      toast.success("🟢 Real-time updates connected", {
        autoClose: 2000,
        position: "bottom-right",
      });
    });

    newSocket.on("disconnect", () => {
      console.log("⚫ Socket disconnected");
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.warn(
        "⚠️ WebSocket unavailable (backend may not support Socket.io):",
        error.message
      );
      setConnected(false);
      // Don't show error toast - backend may not have Socket.io enabled
    });

    // Global error handler
    newSocket.on("error", (error) => {
      console.warn("Socket error (this is optional):", error);
      // Don't show error toast - WebSocket is optional
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const value = {
    socket,
    connected,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
