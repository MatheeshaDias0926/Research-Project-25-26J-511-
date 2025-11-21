# WebSocket Setup (Optional Feature)

## Current Status

✅ WebSocket client is implemented and ready to use  
⚠️ Backend Socket.io server setup is **optional**

## What Works Without Socket.io Backend

All features work perfectly **without** WebSocket:

- ✅ Bus search and tracking
- ✅ Maintenance CRUD operations
- ✅ Admin dashboard
- ✅ Bus logs viewer
- ✅ Data visualization charts
- ✅ Interactive maps
- ✅ Violation resolution

## What WebSocket Adds (Enhancement)

When backend Socket.io is configured, you get:

- 🔴 Real-time bus status updates (auto-refresh without clicking)
- 🔴 Instant violation alerts
- 🔴 Live maintenance log updates
- 🔴 Connection status indicator

## Current Behavior

- Frontend will attempt to connect to `ws://localhost:3000`
- If backend doesn't have Socket.io, it gracefully fails (no errors shown to user)
- Console shows: `⚠️ WebSocket unavailable (backend may not support Socket.io)`
- Connection indicator shows "Offline" (red badge)
- All other features work normally

## To Enable WebSocket (Optional)

### Backend Setup Required:

1. **Install Socket.io in backend:**

   ```bash
   cd backend
   npm install socket.io
   ```

2. **Add to `backend/src/server.js`:**

   ```javascript
   const { Server } = require("socket.io");

   // After creating HTTP server
   const io = new Server(server, {
     cors: {
       origin: "http://localhost:5173",
       methods: ["GET", "POST"],
     },
   });

   // Authentication middleware
   io.use((socket, next) => {
     const token = socket.handshake.auth.token;
     // Verify token here
     next();
   });

   // Connection handler
   io.on("connection", (socket) => {
     console.log("Client connected:", socket.id);

     socket.on("disconnect", () => {
       console.log("Client disconnected:", socket.id);
     });
   });

   // Make io available globally
   global.io = io;
   ```

3. **Emit events from your controllers:**

   ```javascript
   // In bus controller when bus data changes
   if (global.io) {
     global.io.emit("busStatusUpdate", {
       busId: bus._id,
       updates: { currentOccupancy, currentSpeed, etc },
     });
   }

   // When new violation detected
   if (global.io) {
     global.io.emit("newViolation", violationData);
   }

   // When maintenance log updated
   if (global.io) {
     global.io.emit("maintenanceUpdate", maintenanceData);
   }
   ```

## Events Frontend Listens For

```javascript
// Bus status changed
socket.on("busStatusUpdate", (data) => {
  // data: { busId, updates: { currentOccupancy, currentSpeed, ... } }
});

// New violation detected
socket.on("newViolation", (violation) => {
  // violation: { type, busId, timestamp, ... }
});

// Maintenance log updated
socket.on("maintenanceUpdate", (data) => {
  // data: { logId, status, ... }
});
```

## Testing WebSocket

1. **Start backend with Socket.io enabled**
2. **Start frontend**
3. **Check console for:** `✅ Socket connected: [socket-id]`
4. **Look for green "Live" badge** in bottom-right corner
5. **Test real-time updates:**
   - Change bus data → Should auto-update in frontend
   - Create violation → Should show toast notification
   - Update maintenance → Should refresh list

## Troubleshooting

### "WebSocket unavailable" in console

- ✅ **This is normal** if backend doesn't have Socket.io
- Not an error - just informational
- All features still work

### Connection shows "Offline"

- Backend doesn't have Socket.io configured
- Or backend is not running
- Or CORS settings need adjustment

### Errors in browser console

- Check CORS configuration in backend
- Verify token authentication is correct
- Ensure backend Socket.io is listening on port 3000

## Performance Note

WebSocket connection attempts happen once on login:

- No performance impact if backend doesn't have Socket.io
- Gracefully handles connection failures
- No repeated connection attempts (avoids spam)

---

**Bottom Line:** WebSocket is a **nice-to-have enhancement**, not required. The entire application works perfectly without it! 🚀
