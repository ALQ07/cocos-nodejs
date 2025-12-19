import { EventEmitter } from "stream";
import { WebSocket, WebSocketServer } from "ws";
import { ApiMsgEnum, IModel } from "../Common";
import { Connection } from "./Connection";
export class MyServer extends EventEmitter {
    port: number
    wss: WebSocketServer
    connections: Set<Connection> = new Set()
    apiMap: Map<ApiMsgEnum, Function> = new Map()

    constructor({ port }: { port: number }) {
        super()
        this.port = port;
    }

    start() {
        this.wss = new WebSocketServer({ port: this.port });
        return new Promise((resolve, reject) => {
            this.wss.on("listening", () => { resolve(true) });
            this.wss.on("connection", (ws: WebSocket) => {
                // 连接成功后，创建一个连接对象,每一个连接会有一个新的ws对象
                const connection = new Connection(this, ws)
                this.connections.add(connection)
                this.emit("connection", connection)
                connection.on("close", () => {
                    this.connections.delete(connection);
                    this.emit("disconnection", connection)
                })
            });
            this.wss.on("close", () => { reject(false) });
            this.wss.on("error", (e) => { reject(e) });
            this.wss.on("ping", () => { });
            this.wss.on("pong", () => { });
        })
    }

    setApi<T extends keyof IModel['api']>(name: T, cb: (connection: Connection, args: IModel['api'][T]['req']) => void) {
        this.apiMap.set(name, cb)
    }
}