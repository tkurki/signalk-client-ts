#!/usr/bin/env ts-node
import { Client, RootData, LoginResult } from "@signalk/client-ts";
console.log("tries to connect on unresponsive port during 30 seconds.")
console.log("The network timeout is set of 5 seconds.");
console.log("Be patient and wait for the error message...");
console.log("To display debug messages set DEBUG=signalk-client-ts");

const client = new Client({
  host: "demo.signalk.org",
  port: 81, // unresponsive port connection
  reconnect: true,
  idleTimeout: -1
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
      () => client.disconnect().then(() => console.log("30 seconds overrun, abort")),
      30000
    )
  )
  .catch((e) => console.error(e.message));
