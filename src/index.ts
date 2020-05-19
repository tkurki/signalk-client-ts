const isomorphicFetch = require("isomorphic-fetch");
import { Response } from "node-fetch";
import tough from "tough-cookie";
import fetchCookie from "fetch-cookie";
import EventEmitter from "eventemitter3";
import WebSocket from "isomorphic-ws";

const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

export interface ClientOptions {
  host: string;
  port?: number;
  useVersion?: string;
  useToken?: boolean;
  rejectUnauthorized?: boolean;
  useTLS?: boolean;
  reconnect?: boolean;
  maxReconnectInterval?: number;
}

export interface EndPoints {
  version: string;
  "signalk-http"?: string;
  "signalk-ws"?: string;
  "signalk-tcp"?: string;
}

export interface RootData {
  endpoints: {
    [version: string]: EndPoints;
  };
  server: {
    id: string;
    version: string;
  };
}

export interface LoginOptions {
  username: string;
  password: string;
}

export interface LoginResult {
  timeToLive: number;
  token: string;
}

export class Client extends EventEmitter {
  host: string;
  port: number;
  _rootData?: RootData;
  useVersion: string;
  _token: any;
  useToken: boolean;
  fetch: any;
  useTLS: boolean;
  rejectUnauthorized: boolean;
  ws?: WebSocket;
  connectAttemptCount: number;
  reconnect: boolean;
  idleTimeoutInterval?: NodeJS.Timeout;
  lastMessageReceived: number;
  idleTimeout: number;
  maxReconnectInterval: number;
  cookieJar?: tough.CookieJar;

  constructor(clientOptions: ClientOptions) {
    super();
    this.host = clientOptions.host;
    this.port = clientOptions.port || 80;
    this.useVersion = clientOptions.useVersion || "v1";
    this.useToken = clientOptions.useToken || false;
    if (clientOptions.useToken) {
      this.fetch = isomorphicFetch;
    } else {
      this.cookieJar = new tough.CookieJar();
      this.fetch = fetchCookie(isomorphicFetch, this.cookieJar);
    }
    (this.useTLS = clientOptions.useTLS || false),
      (this.rejectUnauthorized = clientOptions.rejectUnauthorized || true);
    this.connectAttemptCount = 0;
    this.reconnect = clientOptions.reconnect || true;
    this.lastMessageReceived = 0;
    this.idleTimeout = 11 * 1000;
    this.maxReconnectInterval = clientOptions.maxReconnectInterval || 5 * 1000;
  }

  rootData(): Promise<RootData> {
    if (this._rootData) {
      return Promise.resolve(this._rootData);
    }
    return this.fetch(this.rootUrl())
      .then((response: any) => response.json())
      .then((json: RootData) => {
        this._rootData = json;
        return json;
      });
  }

  rootUrl(): string {
    return `http://${this.host}:${this.port}/signalk`;
  }

  private getHttpUrl(rootData: RootData) {
    const result = rootData.endpoints["v1"]["signalk-http"];
    if (!result) {
      throw new Error(
        `No signalk-http endpoint in rootData ${JSON.stringify(rootData)}`
      );
    }
    return result;
  }

  private getWsUrl(rootData: RootData) {
    const result = rootData.endpoints["v1"]["signalk-ws"];
    if (!result) {
      throw new Error(
        `No signalk-ws endpoint in rootData ${JSON.stringify(rootData)}`
      );
    }
    return result;
  }

  private loginUrl(rootData: RootData): string {
    const result = this.getHttpUrl(rootData);
    return result.replace("api/", "auth/login");
  }

  login(loginOptions: LoginOptions): Promise<LoginResult> {
    return this.rootData()
      .then((rootData: RootData) =>
        this.fetch(this.loginUrl(rootData), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginOptions),
        })
      )
      .then((response: Response) => {
        if (response.status !== 200) {
          throw new Error(`login failed with status code ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        this._token = json.token;
        return json;
      });
  }
  getVesselsSelfMeta(path: string): Promise<object> {
    return this.getVesselsSelfPath(path, "/meta");
  }

  getVesselsSelfPath(path: string, postPath = ""): Promise<object> {
    const headers: any = {};
    if (this.useToken && this._token) {
      headers.Authorization = `JWT ${this._token}`;
    }
    return this.rootData()
      .then((rootData) =>
        this.fetch(
          `${this.getHttpUrl(rootData)}vessels/self/${path.replace(
            /\./g,
            "/"
          )}${postPath}`,
          { headers }
        )
      )
      .then((r: Response) => {
        if (r.status !== 200) {
          throw new Error(`get failed with status code ${r.status}`);
        }
        return r.json();
      });
  }

  connect(): Promise<void> {
    console.log("Connecting ws");
    this.connectAttemptCount++;
    return this.rootData().then((rootData) => {
      if (isNode && this.useTLS && this.rejectUnauthorized === false) {
        const headers = {};
        if (this.cookieJar) {
          console.log("cookies");
          this.cookieJar
            .getCookiesSync(this.getWsUrl(rootData))
            .forEach((cookie) => console.log(cookie));
        }
        this.ws = new WebSocket(this.getWsUrl(rootData), {
          rejectUnauthorized: false,
        });
      } else {
        this.ws = new WebSocket(this.getWsUrl(rootData));
      }

      this.ws!.on("open", () => {
        this.connectAttemptCount = 0;
        this.idleTimeoutInterval = setInterval(() => {
          if (this.lastMessageReceived < Date.now() - this.idleTimeout) {
            this.disconnect();
          }
        }, 10 * 1000);
        this.emit("open");
      });

      this.ws!.on("error", (err) => {
        console.log("error");
        this.emit("error", err);
      });

      this.ws!.on("close", (event) => {
        console.log("close");
        if (this.idleTimeoutInterval) {
          clearInterval(this.idleTimeoutInterval);
        }
        this.ws = undefined;
        if (this.reconnect) {
          setTimeout(() => {
            this.connect().catch(() => {
              console.error("Connection attempt failed");
              console.error(new Date());
            });
          }, Math.min(this.maxReconnectInterval, Math.pow(1.5, this.connectAttemptCount) + Math.random()));
        }
        this.emit("close", event);
      });

      this.ws!.on("message", (msg) => this.emit("message", msg));

      this.ws!.on("message", (msg) => {
        this.lastMessageReceived = Date.now();
        const parsed = JSON.parse(msg as any);
        if (parsed.updates) {
          this.emit("delta", parsed);
        } else if (parsed.name && parsed.version) {
          this.emit("hello", parsed);
        }
      });

      return new Promise((resolve, reject) => {
        this.ws!.addEventListener("open", () => resolve());
        this.ws!.addEventListener("error", () => reject());
      });
    });
  }

  disconnect(): Promise<void> {
    if (!this.ws) {
      return Promise.reject(
        "Can not disconnect because websocket not connected"
      );
    }
    return new Promise((resolve, reject) => {
      this.ws?.on("close", () => resolve());
      this.ws?.terminate();
      this.reconnect = false;
    });
  }
}
