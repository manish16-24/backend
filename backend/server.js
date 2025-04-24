const { createServer } = require('http');
const { Server } = require('socket.io');

const server = createServer(); // no need to handle HTTP requests

const io = new Server(server, {
  cors: {
    origin: "https://chat-pink-mu.vercel.app", // your frontend on Vercel
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("✅ Client connected");

  socket.on('chat message', ({ text, id }) => {
    io.emit('chat message', { text, id });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
