import logger from "../logger.js";

export function setupSockets(io) {
  io.on("connection", (socket) => {
    logger.info({ id: socket.id }, "Client connected via WebSocket");

    socket.on("ping", (data) => {
      socket.emit("pong", data);
    });

    socket.on("disconnect", () => {
      logger.info({ id: socket.id }, "Client disconnected");
    });
  });
}
