import { _decorator, Component, Label } from 'cc';
import { IRoom } from '../Common';
import { EventEnum } from '../Enum';
import EventManager from '../Global/EventManager';
const { ccclass, property } = _decorator;

@ccclass('RoomManager')
export class RoomManager extends Component {
    id: number

    init({ id, players, hostUid }: IRoom) {
        const host = players.find(player => player.id === hostUid);
        this.id = id
        this.node.getComponent(Label).string = `${host?.nickname}的房间`
        this.node.active = true;
    }

    handleClick() {
        EventManager.Instance.emit(EventEnum.RoomJoin, this.id)
    }

    start() {

    }

    update(deltaTime: number) {

    }
}

