import { _decorator, Component } from "cc";
import { EntityStateEnum } from "../Enum";
import { MoveComponent } from "../Fighting/UnitComponents/MoveComponent";
import StateMachine from "./StateMachine";
const { ccclass, property } = _decorator;

@ccclass("Entity")
export abstract class Entity extends Component {
  fsm: StateMachine;
  private _state: EntityStateEnum;
  private _MoveComponent: MoveComponent = null;

  public get MoveComponent() {
    return this._MoveComponent;
  }

  public set MoveComponent(value: MoveComponent) {
    this._MoveComponent = value;
  }

  get state() {
    return this._state;
  }

  set state(newState) {
    this._state = newState;
    this.fsm.setParams(newState, true);
  }

  update(dt: number) {

  }

  abstract init(...args: any[]): void;
}
