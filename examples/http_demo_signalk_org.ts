#!/usr/bin/env ts-node
import { Client, RootData } from "@signalk/client-ts";

const client = new Client({ host: "demo.signalk.org" });
client.rootData()
  .then((rootData: RootData) => console.log(rootData))
  .catch((err) => console.error(err.message));
