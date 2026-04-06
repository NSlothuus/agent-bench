# Task: Debug — Memory Leak in WebSocket Server

## Category: code
## Difficulty: Hard
## Binary Check: binary_check_memory_leak

## Prompt

Your team's WebSocket chat server is running out of memory in production after ~12 hours. The process starts at 150MB RSS and grows to 2GB+ before getting OOM-killed. You need to review this code and identify all memory leak sources.

The server handles ~500 concurrent connections. Each user can join multiple rooms.

```typescript
// server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface User {
  id: string;
  name: string;
  ws: WebSocket;
  rooms: Set<string>;
  lastSeen: number;
  messageHistory: string[];
}

interface Room {
  id: string;
  name: string;
  members: Map<string, User>;
  messages: Array<{ userId: string; text: string; timestamp: number }>;
  createdAt: number;
}

class ChatServer extends EventEmitter {
  private users = new Map<string, User>();
  private rooms = new Map<string, Room>();
  private connectionLog: Array<{ userId: string; event: string; time: number }> = [];
  private messageHandlers = new Map<string, Function[]>();
  private intervals: NodeJS.Timeout[] = [];

  constructor(private wss: WebSocketServer) {
    super();
    this.setupHeartbeat();
    this.setupCleanup();
  }

  private setupHeartbeat() {
    const interval = setInterval(() => {
      this.users.forEach((user) => {
        if (user.ws.readyState === WebSocket.OPEN) {
          user.ws.ping();
        }
      });
    }, 30000);
    this.intervals.push(interval);
  }

  private setupCleanup() {
    const interval = setInterval(() => {
      const now = Date.now();
      this.users.forEach((user, id) => {
        if (now - user.lastSeen > 300000) { // 5 min timeout
          this.disconnectUser(id);
        }
      });
    }, 60000);
    this.intervals.push(interval);
  }

  handleConnection(ws: WebSocket, userId: string, userName: string) {
    const user: User = {
      id: userId,
      name: userName,
      ws,
      rooms: new Set(),
      lastSeen: Date.now(),
      messageHistory: [],
    };

    this.users.set(userId, user);
    this.connectionLog.push({ userId, event: 'connect', time: Date.now() });

    // Set up message handler
    const onMessage = (data: Buffer) => {
      user.lastSeen = Date.now();
      const msg = JSON.parse(data.toString());
      this.handleMessage(user, msg);
    };

    const onClose = () => {
      this.connectionLog.push({ userId, event: 'disconnect', time: Date.now() });
      this.removeFromAllRooms(user);
    };

    const onError = (err: Error) => {
      this.connectionLog.push({ userId, event: `error: ${err.message}`, time: Date.now() });
    };

    ws.on('message', onMessage);
    ws.on('close', onClose);
    ws.on('error', onError);

    // Register for custom events
    this.on(`user:${userId}:notification`, (notification: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'notification', text: notification }));
      }
    });
  }

  private handleMessage(user: User, msg: any) {
    switch (msg.type) {
      case 'join':
        this.joinRoom(user, msg.roomId);
        break;
      case 'leave':
        this.leaveRoom(user, msg.roomId);
        break;
      case 'chat':
        this.broadcastToRoom(user, msg.roomId, msg.text);
        break;
      case 'subscribe':
        this.subscribeToEvents(user, msg.eventType);
        break;
    }
  }

  private joinRoom(user: User, roomId: string) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: roomId,
        members: new Map(),
        messages: [],
        createdAt: Date.now(),
      };
      this.rooms.set(roomId, room);
    }

    room.members.set(user.id, user);
    user.rooms.add(roomId);

    // Send last 50 messages
    const history = room.messages.slice(-50);
    user.ws.send(JSON.stringify({ type: 'history', roomId, messages: history }));
  }

  private leaveRoom(user: User, roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.members.delete(user.id);
      user.rooms.delete(roomId);
    }
  }

  private broadcastToRoom(user: User, roomId: string, text: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.members.has(user.id)) return;

    const message = { userId: user.id, text, timestamp: Date.now() };
    room.messages.push(message);
    user.messageHistory.push(text);

    const payload = JSON.stringify({ type: 'chat', roomId, ...message });
    room.members.forEach((member) => {
      if (member.ws.readyState === WebSocket.OPEN) {
        member.ws.send(payload);
      }
    });
  }

  private subscribeToEvents(user: User, eventType: string) {
    const handler = (data: any) => {
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(JSON.stringify({ type: 'event', eventType, data }));
      }
    };

    if (!this.messageHandlers.has(user.id)) {
      this.messageHandlers.set(user.id, []);
    }
    this.messageHandlers.get(user.id)!.push(handler);

    this.on(eventType, handler);
  }

  private removeFromAllRooms(user: User) {
    user.rooms.forEach((roomId) => {
      const room = this.rooms.get(roomId);
      if (room) {
        room.members.delete(user.id);
      }
    });
  }

  private disconnectUser(userId: string) {
    const user = this.users.get(userId);
    if (!user) return;

    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.close();
    }

    this.removeFromAllRooms(user);
    this.users.delete(userId);
  }

  shutdown() {
    this.intervals.forEach(clearInterval);
    this.users.forEach((_, id) => this.disconnectUser(id));
  }
}

export { ChatServer };
```

Find ALL memory leak sources. For each one, explain: (1) why it leaks, (2) the growth rate under the described load, (3) how to fix it.

## Grading Key (HIDDEN — server-side only)

### Critical Memory Leaks:
1. **connectionLog grows unbounded** (CRITICAL): Every connect/disconnect/error appends to the array. At 500 connections with reconnects, this grows fast. Never trimmed. Fix: circular buffer or periodic trim.
2. **room.messages grows unbounded** (CRITICAL): Every message in every room is stored forever. Active rooms with chatty users will accumulate thousands of messages. Fix: cap array size, evict old messages.
3. **EventEmitter listener leak on user:${userId}:notification** (CRITICAL): New listener added per connection, NEVER removed on disconnect. If user reconnects, old listener still exists pointing to closed ws. Fix: removeListener/removeAllListeners for user-specific events in disconnectUser().
4. **subscribeToEvents listeners never removed** (CRITICAL): Custom event handlers registered via this.on(eventType, handler) are never cleaned up. The messageHandlers map tracks them but disconnectUser() never calls removeListener(). Fix: in disconnectUser, iterate messageHandlers.get(userId) and removeListener each.
5. **user.messageHistory grows unbounded** (HIGH): Every message text is stored per-user forever. Fix: cap or don't store.

### Important Issues:
6. **onClose doesn't call this.users.delete()** (HIGH): When a socket closes, onClose only removes from rooms but doesn't delete the user from this.users map. The cleanup interval might catch it after 5 min, but during that window the user object (with its ws reference and messageHistory) stays in memory.
7. **Empty rooms never cleaned up** (MEDIUM): When all members leave a room, the room object stays in this.rooms with its entire messages array. Fix: delete room when members.size === 0.
8. **messageHandlers map never cleaned** (MEDIUM): Even when user disconnects, their entry in messageHandlers persists.

### Scoring:
- Found leak 1 (connectionLog): +1.5
- Found leak 2 (room.messages): +1.5
- Found leak 3 (EventEmitter notification): +2
- Found leak 4 (subscribeToEvents): +2
- Found leak 5 (messageHistory): +1
- Found leak 6 (onClose incomplete): +1
- Found leak 7 (empty rooms): +0.5
- Found leak 8 (messageHandlers): +0.5
- False positive (flagging non-leaky code): -0.5 each (max -2)
