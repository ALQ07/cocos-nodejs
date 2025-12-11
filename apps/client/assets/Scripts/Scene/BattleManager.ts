import { _decorator, Component, instantiate, Node, Prefab, SpriteFrame } from 'cc';
import { ApiMsgEnum, EntityTypeEnum, IClientInput, IMsgClientSync, IMsgServerSync, InputTypeEnum } from '../Common';
import { ActorManager } from '../Entity/Actor/ActorManager';
import { BulletManager } from '../Entity/Bullet/BulletManager';
import { EventEnum, PrefabPathEnum, TexturePathEnum } from '../Enum';
import DataManager from '../Global/DataManager';
import EventManager from '../Global/EventManager';
import { NetworkManager } from '../Global/NetworkManager';
import { ObjectPoolManager } from '../Global/ObjectPoolManager';
import { ResourceManager } from '../Global/ResourceManager';
import { JoyStickManager } from '../UI/JoyStickManager';
import { deepClone } from '../Utils';
const { ccclass, property } = _decorator;

@ccclass('BattleManager')
export class BattleManager extends Component {
    @property(Node) stage: Node = null;
    @property(Node) ui: Node = null;
    private shouldUpdate: boolean = false;
    private pendingMsg: IMsgClientSync[] = [];

    async connetServer() {
        await NetworkManager.Instance.connet().catch(()=>{
            console.log('连接失败，ws将自动重连');
        })
    }

    async onLoad() {
        this.clearGame();
        await Promise.all([this.connetServer(), this.loadRes()]);
        this.initGame();
    }

    initGame() {
        DataManager.Instance.jm = this.ui.getComponentInChildren(JoyStickManager);
        DataManager.Instance.stage = this.stage;
        this.initMap();
        this.shouldUpdate = true;
        EventManager.Instance.on(EventEnum.ClientSync, this.handleClientSync, this);
        NetworkManager.Instance.listenMsg(ApiMsgEnum.MsgServerSync, this.handleServerSync, this);
    }

    clearGame() {
        this.stage.destroyAllChildren();
        EventManager.Instance.off(EventEnum.ClientSync, this.handleClientSync, this);
        NetworkManager.Instance.unlistenMsg(ApiMsgEnum.MsgServerSync, this.handleServerSync, this);
    }

    initMap() {
        const prefab = DataManager.Instance.prefabMap.get(EntityTypeEnum.Map);
        const map = instantiate(prefab);
        map.parent = this.stage;
    }

    loadRes() {
        const list = [];
        for (let key in PrefabPathEnum) {
            const p = ResourceManager.Instance.loadRes(PrefabPathEnum[key], Prefab).then((prefab) => {
                DataManager.Instance.prefabMap.set(key, prefab);
            });
            list.push(p);
        }
        for (let key in TexturePathEnum) {
            const p = ResourceManager.Instance.loadDir(TexturePathEnum[key], SpriteFrame).then((spriteFrames) => {
                DataManager.Instance.textureMap.set(key, spriteFrames);
            });
            list.push(p);
        }
        return Promise.all(list);
    }

    update(dt: number) {
        if (!this.shouldUpdate) {
            return;
        }
        this.render();
        this.tick(dt);
    }

    tick(dt: number) {
        this.tickActor(dt);
        // DataManager.Instance.applyInput({
        //     type: InputTypeEnum.TimePast,
        //     dt,
        // })
    }

    tickActor(dt: number) {
        for (let data of DataManager.Instance.state.actors) {
            const { id, type } = data;
            let actorManager = DataManager.Instance.actorMap.get(id);
            if (actorManager) {
                actorManager.tick(dt);
            }
        }
    }

    render() {
        this.renderActor()
        this.renderBullet()
    }

    renderActor() {
        for (let data of DataManager.Instance.state.actors) {
            const { id, type } = data;
            let actorManager = DataManager.Instance.actorMap.get(id);
            if (!actorManager) {
                const prefab = DataManager.Instance.prefabMap.get(type);
                const actor = instantiate(prefab);
                actor.parent = this.stage;
                actorManager = actor.addComponent(ActorManager);
                DataManager.Instance.actorMap.set(id, actorManager);
                actorManager.init(data);
            }
            actorManager.render(data);
        }
    }

    renderBullet() {
        for (let data of DataManager.Instance.state.bullets) {
            const { id, type } = data;
            let bulletManager = DataManager.Instance.bulletMap.get(id);
            if (!bulletManager) {
                // const prefab = DataManager.Instance.prefabMap.get(type)
                const bullet = ObjectPoolManager.Instance.get(type);
                // bullet.parent = this.stage;
                bulletManager = bullet.getComponent(BulletManager) || bullet.addComponent(BulletManager);
                DataManager.Instance.bulletMap.set(id, bulletManager);
                bulletManager.init(data);
            }
            bulletManager.render(data);
        }
    }

    handleClientSync(input: IClientInput) {
        const msg = {
            input,
            frameId: DataManager.Instance.frameId++,
        }
        NetworkManager.Instance.sendMsg(ApiMsgEnum.MsgClientSync, msg);

        // 客户端预测
        if (input.type === InputTypeEnum.ActorMove) {
            DataManager.Instance.applyInput(input);
            this.pendingMsg.push(msg);
        }
    }

    handleServerSync({ inputs, lastFrameId }: IMsgServerSync) {
        // 客户端回滚
        DataManager.Instance.state = DataManager.Instance.lastState;
        for (const input of inputs) {
            DataManager.Instance.applyInput(input);
        }

        DataManager.Instance.lastState = deepClone(DataManager.Instance.state);
        this.pendingMsg = this.pendingMsg.filter((msg) => msg.frameId > lastFrameId);
        for (const msg of this.pendingMsg) {
            DataManager.Instance.applyInput(msg.input);
        }
    }
}

