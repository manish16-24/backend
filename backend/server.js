const { createServer } = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const server = createServer();
const io = new Server(server, {
  cors: {origin: "https://chat-pink-mu.vercel.app",  methods: ["GET","POST"], credentials: true }
});

// PostgreSQL connection pool
const pool = new Pool({
  user: 'chat',
  host: 'dpg-d059duvgi27c738ngbu0-a',
  database: 'chat_hnmj',
  password: 'RCHGwCGJsL3yxgFdx3fdHHxUdmkKOdbu',
  port: 5432,
});

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'chat',
//   password: 'chat',
//   port: 5432,
// });

// Create messages table if not exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);
    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ Database setup error:', err);
  }
})();

async function broadcastUserCount(room) {
  const count = io.sockets.adapter.rooms.get(room)?.size || 0;
  io.to(room).emit('userCount', count);
}

async function getMessageHistory(room) {
  try {
    const res = await pool.query(
      'SELECT text, user_id as id, username, timestamp FROM messages WHERE room = $1 ORDER BY timestamp ASC',
      [room]
    );
    console.log(res.rows);
    return res.rows;
  } catch (err) {
    console.error('Error fetching message history:', err);
    return [];
  }
}

async function storeMessage(message) {
  try {
    await pool.query(
      'INSERT INTO messages (room, text, user_id, username, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [message.room, message.text, message.id, message.username, message.timestamp]
    );
  } catch (err) {
    console.error('Error storing message:', err);
  }
}

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('joinRoom', async (room) => {
    socket.join(room);
    broadcastUserCount(room);
    
    // Send message history from PostgreSQL
    const history = await getMessageHistory(room);
    socket.emit('messageHistory', history);
  });

  // socket.on('chat message', async ({ text, id, username, timestamp, room }) => {
  //   const message = { text, id, username, timestamp, room };
    
  //   // Store message in PostgreSQL
  //   await storeMessage(message);

  //   // Broadcast to room
  //   io.to(room).emit('chat message', { text, id, username, timestamp });
  // });

  // In your server code
socket.on('chat message', async ({ text, id, username, room }) => {
  const timestamp = Date.now(); // Numeric timestamp
  const message = { text, id, username, timestamp, room };
  await storeMessage(message);

  // Broadcast to room
  io.to(room).emit('chat message', { text, id, username, timestamp });
  // ...
});

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) broadcastUserCount(room);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Socket.IO server on port ${PORT}`));
