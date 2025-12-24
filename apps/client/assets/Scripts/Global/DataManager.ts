import { Node, Prefab, SpriteFrame } from "cc";
import Singleton from "../Base/Singleton";
import { IBullet, IClientInput, InputTypeEnum, IRoom, IState, randomBySeed } from "../Common";
import { ActorEntity } from "../Entity/Actor/ActorEntity";
import { BulletEntity } from "../Entity/Bullet/BulletEntity";
import { EventEnum } from "../Enum";
import { JoyStickManager } from "../UI/JoyStickManager";
import EventManager from "./EventManager";

const ACTOR_SPEED = 100;
const BULLET_SPEED = 600;
const MAP_WIDTH = 960;
const MAP_HEIGHT = 640;
const ACTOR_RADIUS = 50;
const BULLET_RADIUS = 10;
const BULLET_DAMAGE = 5;

export default class DataManager extends Singleton {
  static get Instance() {
    return super.GetInstance<DataManager>();
  }

  myPlayerId: number = 1;
  frameId: number = 1;
  roomInfo: IRoom
  jm: JoyStickManager;
  stage: Node;
  actorMap: Map<number, ActorEntity> = new Map();
  bulletMap: Map<number, BulletEntity> = new Map();
  prefabMap: Map<string, Prefab> = new Map();
  textureMap: Map<string, SpriteFrame[]> = new Map();

  lastState: IState
  state: IState = {
    actors: [
      //   {
      //     id: 1,
      //     hp: 30,
      //     type: EntityTypeEnum.Actor1,
      //     weaponType: EntityTypeEnum.Weapon1,
      //     bulletType: EntityTypeEnum.Bullet1,
      //     position: {
      //       x: 0,
      //       y: 0
      //     },
      //     direction: {
      //       x: 1,
      //       y: 1
      //     }
      //   },
      //   {
      //     id: 2,
      //     hp: 30,
      //     type: EntityTypeEnum.Actor1,
      //     weaponType: EntityTypeEnum.Weapon1,
      //     bulletType: EntityTypeEnum.Bullet1,
      //     position: {
      //       x: 150,
      //       y: 150
      //     },
      //     direction: {
      //       x: -1,
      //       y: 1
      //     }
      //   }
    ],
    bullets: [],
    nextBulletId: 1,
    seed: 1
  }

  applyInput(input: IClientInput) {
    switch (input.type) {
      case InputTypeEnum.ActorMove: {
        const { id, type, direction, deltaTime } = input;
        const actor = this.state.actors.find(actor => actor.id === id);
        actor.direction = direction;

        actor.position.x += direction.x * deltaTime * ACTOR_SPEED;
        actor.position.y += direction.y * deltaTime * ACTOR_SPEED;
        break;
      }
      case InputTypeEnum.WeaponShoot: {
        const { owner, direction, position } = input;
        const bullet: IBullet = {
          id: this.state.nextBulletId++,
          owner,
          position,
          direction,
          type: this.actorMap.get(owner).bulletType
        }
        EventManager.Instance.emit(EventEnum.BulletBorn, owner);
        this.state.bullets.push(bullet);
        break;
      }
      case InputTypeEnum.TimePast: {
        const { dt } = input;
        const { bullets, actors } = this.state;
        for (let i = bullets.length - 1; i >= 0; i--) {
          const bullet = bullets[i];
          let isCollide = false;
          for (let j = actors.length - 1; j >= 0; j--) {
            const actor = actors[j];
            if ((actor.position.y - bullet.position.y) ** 2 + (actor.position.x - bullet.position.x) ** 2 <= (ACTOR_RADIUS + BULLET_RADIUS) ** 2) {
              EventManager.Instance.emit(EventEnum.ExplosionBorn, bullet.id, bullet.position);
              bullets.splice(i, 1);
              const random = randomBySeed(this.state.seed);
              this.state.seed = random;
              const damage = random / 233280 >= 0.5 ? BULLET_DAMAGE * 2 : BULLET_DAMAGE;
              actor.hp -= damage;
              isCollide = true;
              break;
            }
          }

          if (isCollide) continue;

          if (Math.abs(bullet.position.x) > MAP_WIDTH / 2 || Math.abs(bullet.position.y) > MAP_HEIGHT / 2) {
            EventManager.Instance.emit(EventEnum.ExplosionBorn, bullet.id, bullet.position);
            bullets.splice(i, 1);
          }
        }
        for (const bullet of bullets) {
          bullet.position.x += bullet.direction.x * BULLET_SPEED * dt;
          bullet.position.y += bullet.direction.y * BULLET_SPEED * dt;
        }
        break;
      }
      default:
        break;
    }
  }
}
