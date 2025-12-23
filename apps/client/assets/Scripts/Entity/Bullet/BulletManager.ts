import { _decorator, Tween, tween, Vec3 } from 'cc';
import { EntityManager } from '../../Base/EntityManager';
import { EntityTypeEnum, IBullet, IVec2 } from '../../Common';
import { EntityStateEnum, EventEnum } from '../../Enum';
import DataManager from '../../Global/DataManager';
import EventManager from '../../Global/EventManager';
import { ObjectPoolManager } from '../../Global/ObjectPoolManager';
import { rad2Angle } from '../../Utils';
import { ExplosionManager } from '../Explosion/ExplosionManager';
import { BulletStateMachine } from './BulletStateMachine';
const { ccclass, property } = _decorator;

@ccclass('BulletManager')
export class BulletManager extends EntityManager {

    type: EntityTypeEnum;
    id: number;
    private targetPos: Vec3
    private tw: Tween<unknown>

    start() {

    }

    init(data: IBullet) {
        this.fsm = this.node.addComponent(BulletStateMachine);
        this.fsm.init(data.type);
        this.id = data.id;
        this.state = EntityStateEnum.Idle;
        this.type = data.type;
        this.node.active = false;
        this.targetPos = undefined;
        EventManager.Instance.on(EventEnum.ExplosionBorn, this.handleExplosionBorn, this);
    }

    handleExplosionBorn(id: number, pos: IVec2) {
        if (id != this.id) return;
        // const prefab = DataManager.Instance.prefabMap.get(EntityTypeEnum.Explosion);
        const explosion = ObjectPoolManager.Instance.get(EntityTypeEnum.Explosion);
        // explosion.parent = DataManager.Instance.stage;
        const explosionManager = explosion.getComponent(ExplosionManager) || explosion.addComponent(ExplosionManager);
        explosionManager.init(EntityTypeEnum.Explosion, pos);
        ObjectPoolManager.Instance.ret(this.node);
        EventManager.Instance.off(EventEnum.ExplosionBorn, this.handleExplosionBorn, this);
        DataManager.Instance.bulletMap.delete(this.id);
    }

    render(data: IBullet) {
        this.renderPos(data);
        this.renderDire(data);
    }

    renderPos(data: IBullet) {
        const { id, type, position, direction } = data;
        this.node.position = new Vec3(position.x, position.y, 0);
        const newPos = new Vec3(position.x, position.y);
        if (!this.targetPos) {
            this.node.active = true;
            this.node.setPosition(newPos);
            this.targetPos = new Vec3(newPos);
        } else if (!this.targetPos.equals(newPos)) {
            this.tw?.stop();
            this.node.setPosition(this.targetPos);
            this.targetPos.set(newPos);
            this.tw = tween(this.node).to(0.1, {
                position: this.targetPos
            }).start()
        }
    }

    renderDire(data: IBullet) {
        const { id, type, position, direction } = data;
        // const side = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        const rad = Math.atan2(direction.y, direction.x);
        const angle = rad2Angle(rad);
        // const rad = direction.x > 0 ? Math.asin(direction.y / side) : Math.asin(-direction.y / side);
        // const angle = direction.x > 0 ? rad2Angle(rad) : rad2Angle(rad) + 180;
        this.node.setRotationFromEuler(new Vec3(0, 0, angle));
    }


}