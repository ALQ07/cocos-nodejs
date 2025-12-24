import { _decorator, v3 } from 'cc';
import { EntityManager } from '../../Base/EntityManager';
import { EntityTypeEnum, IVec2 } from '../../Common';
import { EntityStateEnum } from '../../Enum';
import { ExplosionStateMachine } from './ExplosionStateMachine';
const { ccclass, property } = _decorator;

@ccclass('ExplosionEntity')
export class ExplosionEntity extends EntityManager {

    type: EntityTypeEnum;
    id: number;

    start() {

    }

    init(type: EntityTypeEnum, pos: IVec2) {
        this.type = type;
        this.node.position = v3(pos.x, pos.y, 0);
        this.fsm = this.node.addComponent(ExplosionStateMachine);
        this.fsm.init(type);
        this.state = EntityStateEnum.Idle;
    }

}