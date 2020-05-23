#!/usr/bin/env ts-node

import { Client } from "@signalk/client-ts";

const client = new Client({ host: "localhost", port: 3000 });
client.on("hello", (h) => console.log(h));
client.on("delta", (d) => console.log(d));
client.on("connect", (c) => console.log(c));
client
  .login({ username: "admin", password: "admin" })
  .then(() => client.connect())
  .then(() => {
    console.log("connected");
  })
  .catch((e) => console.error(e.message));
