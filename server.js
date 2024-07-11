const jsonServer = require('json-server');
const http = require('http');
const path = require('path');

// Create a JSON Server
const app = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));  // Ensure your db.json path is correct
const middlewares = jsonServer.defaults();
const server = http.createServer(app);

app.use(middlewares);
app.use(jsonServer.bodyParser);
app.use(router); 

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

  res.json({ chats: paginatedChats, cursor: { last_element_position: startPosition + paginatedChats.length } });
});

// Custom route for fetching messages with pagination
app.post('/fetch/messages', (req, res) => {
  const { chat_id, cursor } = req.body;
  const { last_message_id, page_size } = cursor;

  
  let messages = router.db.get('messages').filter({ chat_id }).sortBy('created_at').reverse().value();

  if (last_message_id) {
    
    const lastIndex = messages.findIndex(msg => msg.id === last_message_id);
   
    messages = messages.slice(lastIndex + 1, lastIndex + 1 + page_size);
  } else {
   
    messages = messages.slice(0, page_size);
  }

  const hasMoreMessages = messages.length === page_size;
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  res.json({
    messages: messages,
    cursor: {
      last_message_id: lastMessageId,
      page_size,
      has_next_message: hasMoreMessages
    }
  });
});

// Custom route for adding a new message
app.post('/add-message', (req, res) => {
 
  const { chatId, content, created_at, sender_id } = req.body;
  const newMessage = { id: Date.now().toString(), chat_id: chatId, content, created_at, sender_id };
  res.json(newMessage);
});

// Custom route for marking a chat as read
app.post('/mark-as-read', (req, res) => {
  
  res.json({ status: "Success" });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Mock JSON Server is running at http://localhost:${PORT}`);
});
