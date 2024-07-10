const jsonServer = require('json-server');
const http = require('http');
const socketIo = require('socket.io');

// Create a JSON Server
const app = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  }
});

app.use(middlewares);
app.use(jsonServer.bodyParser);

// Custom route for fetching chats with filters and pagination
app.post('/fetch/chats', (req, res) => {
  const { applied_filters, user_id, page_details } = req.body;
  const { read, bookmark } = applied_filters;
  const { page_size, last_element_position } = page_details;

  let chats = router.db.get('chats').filter(chat => chat.user_id === user_id).value();

  if (read !== undefined) {
    chats = chats.filter(chat => chat.last_message.status === (read ? 'READ' : 'DELIVERED'));
  }

  if (bookmark !== undefined) {
    chats = chats.filter(chat => chat.bookmark === bookmark);
  }

  const startPosition = last_element_position || 0;
  const paginatedChats = chats.slice(startPosition, startPosition + page_size);

  res.json({ chats: paginatedChats, cursor: { last_element_position: startPosition + page_size } });
});

// Custom route for fetching messages with pagination
app.post('/fetch/messages', (req, res) => {
  const { chat_id, cursor } = req.body;
  const { last_message_id, page_size } = cursor;

  let messages = router.db.get('messages').filter(message => message.chat_id === chat_id).value();

  if (last_message_id) {
    const index = messages.findIndex(message => message.id === last_message_id);
    if (index !== -1) {
      messages = messages.slice(index + 1, index + 1 + page_size);
    }
  } else {
    messages = messages.slice(0, page_size);
  }

  const hasNextMessage = messages.length === page_size;

  res.json({ messages, cursor: { last_message_id: messages[messages.length - 1]?.id || null, page_size, has_next_message: hasNextMessage } });
});

// Custom route for marking a chat as read
app.post('/mark-as-read', (req, res) => {
  const { chat_id, read } = req.body;

  const chat = router.db.get('chats').find({ chat_id }).assign({ 'last_message.status': read ? 'READ' : 'DELIVERED' }).write();

  res.json(chat);
});

// WebSocket setup
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', ({ chatId }) => {
    socket.join(chatId);
  });

  socket.on('message', (message) => {
    io.to(message.chatId).emit('message', message);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`JSON Server is running at http://localhost:${PORT}`);
});
