// iceserver.ts

import { Application, send } from "https://deno.land/x/oak/mod.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  WebSocket,
  acceptable,
} from "https://deno.land/std/ws/mod.ts";

const app = new Application();

// Serve HTML and JS files
app.use(async (context) => {
  const path = context.request.url.pathname;
  if (path === "/") {
    await send(context, path, {
      root: `${Deno.cwd()}/static`,
      index: "index.html",
    });
  }
});

// WebSocket handling
app.use(async (context) => {
  if (acceptable(context.request)) {
    const { conn, r: bufReader, w: bufWriter, headers } = context.request.serverRequest;
    const ws = await acceptWebSocket({
      conn,
      bufReader,
      bufWriter,
      headers,
    });

    handleWebSocket(ws);
  }
});

// Array to keep track of connected websockets
const clients =[];

async function handleWebSocket(ws) {
  try {
    clients.push(ws);
    console.log("Client connected");

    for await (const event of ws) {
      if (typeof event === "string") {
        handleSignalingData(JSON.parse(event), ws);
      } else if (isWebSocketCloseEvent(event)) {
        // Handle close events
        console.log("Client disconnected");
        clients.splice(clients.indexOf(ws), 1);
      }
    }
  } catch (err) {
    console.error(`Failed to receive frame: ${err}`);
    if (!ws.isClosed) {
      await ws.close(1000).catch(console.error);
    }
  }
}

function handleSignalingData(data, sender) {
  switch (data.type) {
    case "offer":
    case "answer":
      // Forward the SDP offer/answer to all other clients
      clients.forEach((client) => {
        if (client !== sender) {
          client.send(JSON.stringify({ ...data, sender: sender === ws1 ? "ws1" : "ws2" }));
        }
      });
      break;
    case "ice-candidate":
      // Forward ICE candidate to all other clients
      clients.forEach((client) => {
        if (client !== sender) {
          client.send(JSON.stringify({ ...data, sender: sender === ws1 ? "ws1" : "ws2" }));
        }
      });
      break;
  }
}

// Start the server
const PORT = 8000;
console.log(`Server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });
