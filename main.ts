// ws_server.ts
import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
const app = new Application({ logErrors: false });
const router = new Router();

router.get("/wss", (ctx) => {
  console.log("wss");
  if (!ctx.isUpgradable) {
    ctx.throw(501);
  }
  const ws = ctx.upgrade();
  // ws.id =
  ws.onopen = () => {
    clients.push(ws);
    console.log("Connected to client", clients.length);
  };
  ws.onmessage = ({ data }) => {
    const parsed = JSON.parse(data);
    console.log("Got message from client: ", JSON.parse(data));
    switch (parsed.type) {
      case "offer":
      case "answer":
      case "ice-candidate":
        // Forward the SDP offer/answer to all other clients
        clients.forEach((client) => {
          if (client !== ws) {
            console.log("sending", parsed.type);
            client.send(JSON.stringify(parsed));
          }
        });
        break;
    }
  };
  ws.onclose = () => {
    console.log("Disconncted from client");
    clients.splice(clients.indexOf(ws), 1);
  };
});
app.use(router.routes());
app.use(async (context, next) => {
  console.log(context.request.url.pathname);
  if (context.request.url.pathname == "/index.html") {
    await send(context, context.request.url.pathname, {
      root: `${Deno.cwd()}/static`,
      index: "index.html",
    });
  } else {
    next();
  }
});
app.use(router.allowedMethods());
app.listen({ port: 8000 });

// Array to keep track of connected websockets
const clients: WebSocket[] = [];

async function handleWebSocket(ws: WebSocket) {
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
    if (!ws.CLOSED) {
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
          client.send(JSON.stringify(data));
        }
      });
      break;
    case "ice-candidate":
      // Forward ICE candidate to all other clients
      clients.forEach((client) => {
        if (client !== sender) {
          client.send(JSON.stringify(data));
        }
      });
      break;
  }
}
