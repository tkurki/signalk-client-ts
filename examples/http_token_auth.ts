#!/usr/bin/env ts-node
import { Client, RootData, LoginResult } from "@signalk/client-ts";

//use token explicitly, no cookies
const client = new Client({ host: "localhost", port: 3000, useToken: true });
client
  .login({ username: "admin", password: "admin" })
  .then((loginResult: LoginResult) => {
    console.log(loginResult);
    return fetchSomeStuff(client);
  })
  .catch((err) => console.error(err));

const fetchSomeStuff = (client: Client) =>
  client
    .getVesselsSelfPath("navigation.speedOverGround")
    .then((r: any) => console.log(JSON.stringify(r, null, 2)))
    .then(() => {
      client
        .getVesselsSelfMeta("navigation.speedOverGround")
        .then((r: any) => console.log(JSON.stringify(r, null, 2)));
    });
