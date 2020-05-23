#!/usr/bin/env ts-node
import { Client, RootData, LoginResult } from "@signalk/client-ts";
console.log("tries to connet on closed port during 5 seconds.")
console.log("To display debug messages set DEBUG=signalk-client-ts");

const client = new Client({
  host: "localhost",
  port: 0, // closed port connection
  reconnect: true
});
client.on("hello", (h) => console.log("onHello ",h));
client.on("delta", (d) => console.log("onDelta ",d));
client.on("connect", () => console.log("onConnect"));
client.on("open", () => console.log("onOpen"));
client.on("error", (e) => console.log("onError ",e.message));
client.on("connecting", () => console.log("onConnecting"));
client
  .connect()
  .then((x) =>
    setTimeout(
      () => client.disconnect().then(() => console.log("5 seconds overrun, abort")),
      5000
    )
  )
  .catch((e) => console.error(e.message));

