import { _decorator, instantiate, ProgressBar, tween, Tween, v3, Vec3 } from 'cc';
import { EntityManager } from '../../Base/EntityManager';
import { EntityTypeEnum, IActor, InputTypeEnum } from '../../Common';
import { EntityStateEnum, EventEnum } from '../../Enum';
import DataManager from '../../Global/DataManager';
import EventManager from '../../Global/EventManager';
import { rad2Angle } from '../../Utils';
import { WeaponEntity } from '../Weapon/WeaponEntity';
import { ActorStateMachine } from './ActorStateMachine';
const { ccclass, property } = _decorator;

@ccclass('ActorEntity')
export class ActorEntity extends EntityManager {
    private wm: WeaponEntity = null;
    private targetPos: Vec3
    private tw: Tween<unknown>

    bulletType: EntityTypeEnum;
    id: number;
    hp: ProgressBar;

    start() {

    }

    tick(deltaTime: number) {
        if (this.id != DataManager.Instance.myPlayerId) return;
        if (DataManager.Instance.jm?.input?.length()) {
            const { x, y } = DataManager.Instance.jm.input;
            EventManager.Instance.emit(EventEnum.ClientSync, {
                id: DataManager.Instance.myPlayerId,
                type: InputTypeEnum.ActorMove,
                direction: { x, y },
                deltaTime,
            });
            // DataManager.Instance.applyInput({
            //     id: 1,
            //     type: InputTypeEnum.ActorMove,
            //     direction: { x, y },
            //     deltaTime,
            // })
            // this.state = EntityStateEnum.Run;
        } else {
            // this.state = EntityStateEnum.Idle;
        }
    }

    init(data: IActor) {
        this.id = data.id;
        this.fsm = this.node.addComponent(ActorStateMachine);
        this.hp = this.node.getComponentInChildren(ProgressBar);
        this.fsm.init(data.type);
        this.state = EntityStateEnum.Idle;
        this.node.active = false;
        this.targetPos = undefined;
        this.bulletType = EntityTypeEnum.Bullet2;
        const weapon = instantiate(DataManager.Instance.prefabMap.get(EntityTypeEnum.Weapon1));
        weapon.parent = this.node;
        this.wm = weapon.addComponent(WeaponEntity);
        this.wm.init(data);
    }

    render(data: IActor) {
        this.renderPos(data);
        this.renderDire(data);
        this.renderHP(data);
    }

    renderPos(data: IActor) {
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
            this.state = EntityStateEnum.Run;
            this.tw = tween(this.node).to(0.1, {
                position: this.targetPos
            }).call(() => {
                this.state = EntityStateEnum.Idle;
            }).start()
        }
    }

    renderDire(data: IActor) {
        const { id, type, position, direction } = data;
        // this.node.position = new Vec3(position.x, position.y, 0);
        this.node.setScale(v3(direction.x > 0 ? 1 : -1, 1, 1));
        this.hp.node.setScale(v3(direction.x > 0 ? 1 : -1, 1, 1));
        // 方案一：使用 Math.asin 计算角度
        // const side = Math.sqrt(direction.x ** 2 + direction.y ** 2);
        // const rad = Math.asin(direction.y / side);
        // 方案二：使用 Math.atan2 计算角度（需要对x分量取绝对值）
        const rad = Math.atan2(direction.y, Math.abs(direction.x));
        const angle = rad2Angle(rad);
        this.wm.node.setRotationFromEuler(new Vec3(0, 0, angle));
    }

    renderHP(data: IActor) {
        this.hp.progress = data.hp / this.hp.totalLength;
    }
}



// 我来用更直观的方式解释为什么 atan2 会导致武器翻转！

// 核心问题：坐标系的双重影响
// 让我们一步步分析这个问题：

// 1. 理解角色的翻转机制
// TypeScript



// this.node.setScale(v3(direction.x > 0 ? 1 : -1, 1, 1));
// 这行代码的作用：

// 当角色向右时：scale.x = 1（正常）
// 当角色向左时：scale.x = -1（水平翻转）
// 关键点：当 scale.x = -1 时，角色的整个局部坐标系都被水平翻转了！

// 2. atan2 的角度计算
// 假设鼠标在角色左上方，direction = {x: -3, y: 4}：

// TypeScript



// const rad = Math.atan2(4, -3);  // 计算结果约为 126.9°
// 3. 翻转的视觉效果分析
// 让我们看看武器在不同情况下的实际朝向：

// 情况A：角色向右（scale.x = 1）
// PlainText



// 鼠标在右上方：direction = {x: 3, y: 4}atan2(4, 3) = 53.1°武器旋转 53.1°，指向右上方 ✅ 正确
// 情况B：角色向左（scale.x = -1）
// PlainText



// 鼠标在左上方：direction = {x: -3, y: 4}atan2(4, -3) = 126.9°
// 这里是关键：武器要旋转 126.9°，但是在翻转的坐标系中！

// 4. 翻转坐标系中的角度含义
// 在正常坐标系中：

// 0° = 向右
// 90° = 向上
// 180° = 向左
// 270° = 向下
// 在翻转坐标系中（scale.x = -1）：

// 0° = 向左（原来的向右被翻转了）
// 90° = 向上（Y轴没变）
// 180° = 向右（原来的向左被翻转了）
// 270° = 向下（Y轴没变）
// 5. 126.9° 在翻转坐标系中的实际指向
// 126.9° 在翻转坐标系中：

// 这个角度超过了 90°，意味着武器要"转过头"
// 在翻转的坐标系中，126.9° 实际指向的是右下方
// 但我们期望的是左上方
// 6. 用图形直观理解
// PlainText



// 正常坐标系（角色向右）：     90°      ↑180° ← → 0°      ↓    270°翻转坐标系（角色向左）：     90°      ↑  0° ← → 180°  （注意：左右颠倒了！）      ↓    270°
// 当武器旋转 126.9° 时：

// 在正常坐标系：指向左上方
// 在翻转坐标系：指向右下方（因为坐标轴翻转了）
// 7. 为什么 asin 不会有这个问题？
// TypeScript



// const side = Math.sqrt(direction.x ** 2 + direction.y ** 2);const rad = Math.asin(direction.y / side);
// 对于 direction = {x: -3, y: 4}：

// PlainText



// side = √(9 + 16) = 5rad = asin(4/5) = asin(0.8) = 53.1°
// 关键差异：

// asin 只关注 Y 分量，给出 53.1°
// 在翻转坐标系中，53.1° 仍然指向上方
// 由于整个角色已经翻转，武器相对于角色的朝向是正确的
// 8. 最终效果对比
// 场景	atan2结果	翻转坐标系中的实际指向	asin结果	翻转坐标系中的实际指向
// 左上方	126.9°	右下方 ❌	53.1°	左上方 ✅
// 左下方	-126.9°	右上方 ❌	-53.1°	左下方 ✅
// 总结
// atan2 翻转的根本原因：

// 1.
// atan2 给出的角度范围是 [-180°, 180°]
// 2.
// 当角度超过 ±90° 时，在翻转的坐标系中会指向错误的方向
// 3.
// 翻转坐标系改变了角度的含义，但 atan2 不知道这个变化
// asin 成功的原因：

// 1.
// asin 的角度范围限制在 [-90°, 90°]
// 2.
// 这个范围内的角度在翻转坐标系中仍然保持正确的相对方向
// 3.
// 配合角色翻转，完美覆盖了所有方向
// 简单来说：atan2 不知道父节点翻转了，还按照原来的坐标系给角度，结果就错了！

