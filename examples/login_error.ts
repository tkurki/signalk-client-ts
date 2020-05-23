#!/usr/bin/env ts-node
import { Client, LoginResult } from "@signalk/client-ts";

const client = new Client({ host: "localhost", port: 3000 });
client.login({ username: "admin", password: "adminnnnnn" })
  .then((lr: LoginResult) => console.log(lr)) //never called
  .catch((err) => console.error(err.message));
