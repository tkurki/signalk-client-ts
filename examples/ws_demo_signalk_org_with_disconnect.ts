#!/usr/bin/env ts-node
import { Client, RootData, LoginResult } from "@signalk/client-ts";

const client = new Client({ host: "demo.signalk.org" });
client.on("hello", (h) => console.log(h));
client.on("delta", (d) => console.log(d));
client.on("connect", (c) => console.log(c));
client
  .connect()
  .then((x) =>
    setTimeout(
      () => client.disconnect().then(() => console.log("DISCONNECTED")),
      2000
    )
  )
  .catch((e) => console.error(e));
