import Singleton from "../Base/Singleton";
import { IModel } from "../Common";
import { delay } from "../Utils";

interface Iitem {
    cb: Function,
    ctx: unknown
}

interface ICallApiRet<T> {
    success: boolean,
    error?: Error,
    res?: T
}

export class NetworkManager extends Singleton {
    isConnected: boolean = false;
    port = 9876;
    ws: WebSocket;

    // 断线重连相关属性
    private reconnectAttempts: number = 0; //重连次数
    private isReconnecting: boolean = false; // 是否正在重连

    private map: Map<string, Array<Iitem>> = new Map();

    public static get Instance() {
        return super.GetInstance<NetworkManager>();
    }

    connet() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve(true);
                return;
            }

            this.ws = new WebSocket(`ws://localhost:${this.port}`);
            this.ws.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0; // 重置重连次数
                this.isReconnecting = false; // 重置重连状态
                resolve(true);
            };
            this.ws.onmessage = (event) => {
                const obj = JSON.parse(event.data);
                const { name, data } = obj;
                if (this.map.has(name)) {
                    this.map.get(name).forEach(({ cb, ctx }) => {
                        cb.call(ctx, data);
                    })
                }
            };
            this.ws.onerror = (error) => {
                this.isConnected = false;

                reject(false);
            };
            this.ws.onclose = async () => {
                this.isConnected = false;
                // 如果不是手动关闭，则启动重连
                if(!this.isReconnecting){
                    await this.autoReconnect();
                }
                reject(false);
            };
        })
    }

    /**自动重连 */
    private async autoReconnect(){
        if(this.isReconnecting) return;

        this.isReconnecting = true;
        this.reconnectAttempts++;
        console.log(`第${this.reconnectAttempts}次自动重连`)
        // 等待1s后重连
        await delay(1000);

        try {
            await this.connet();
            console.log('自动重连成功')
        } catch (error) {
            console.log(`第${this.reconnectAttempts}次重连失败，继续尝试...`, error)
            this.isReconnecting = false;
            await this.autoReconnect();
        }
    }

    /**手动重连 */
    public async reconnect(){
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        if(this.ws){
            this.ws.close();
        }
        return await this.connet();
    }

    callApi<T extends keyof IModel['api']>(name: T, data: IModel['api'][T]['req']): Promise<ICallApiRet<IModel['api'][T]['res']>> {
        return new Promise((resolve, reject) => {
            try {
                const timer = setTimeout(() => {
                    resolve({ success: false, error: new Error("Time out !") })
                    this.unlistenMsg(name as any, cb, null)
                }, 5000);
                const cb = (res) => {
                    this.unlistenMsg(name as any, cb, null)
                    clearTimeout(timer);
                    resolve(res)
                }
                this.listenMsg(name as any, cb, null)
                this.sendMsg(name as any, data)
            } catch (error) {
                resolve({ success: false, error: error })
            }
        })
    }

    async sendMsg<T extends keyof IModel['msg']>(name: T, data: IModel['msg'][T]) {
        const obj = { name, data }
        // 模拟延时
        // await delay(2000);

        this.ws.send(JSON.stringify(obj));
    }

    listenMsg<T extends keyof IModel['msg']>(name: T, cb: (args: IModel['msg'][T]) => void, ctx: unknown) {
        if (this.map.has(name)) {
            this.map.get(name).push({ cb, ctx });
        } else {
            this.map.set(name, [{ cb, ctx }]);
        }
    }

    unlistenMsg<T extends keyof IModel['msg']>(name: T, cb: (args: IModel['msg'][T]) => void, ctx: unknown) {
        if (this.map.has(name)) {
            const index = this.map.get(name).findIndex((i) => i.cb === cb && i.ctx === ctx);
            index > -1 && this.map.get(name).splice(index, 1);
        }
    }
}