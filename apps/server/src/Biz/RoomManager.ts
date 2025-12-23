import Singleton from "../Base/Singleton";
import { ApiMsgEnum } from "../Common";
import PlayerManager from "./PlayerManager";
import { Room } from "./Room";

export default class RoomManager extends Singleton {
    static get Instance() {
        return super.GetInstance<RoomManager>();
    }

    nextRoomId: number = 1
    rooms: Set<Room> = new Set()
    idMapRoom: Map<number, Room> = new Map()

    createRoom(uid: number) {
        const room = new Room(this.nextRoomId++, uid)
        this.rooms.add(room)
        this.idMapRoom.set(room.id, room)
        return room
    }

    startRoom(rid: number) {
        const room = this.idMapRoom.get(rid)
        if (room) {
            room.start()
            return room
        }
    }

    joinRoom(rid: number, uid: number) {
        const room = this.idMapRoom.get(rid)
        if (room) {
            room.join(uid)
            return room
        }
    }

    leaveRoom(rid: number, uid: number) {
        const room = this.idMapRoom.get(rid)
        if (room) {
            room.leave(uid)
        }
    }

    closeRoom(rid: number) {
        const room = this.idMapRoom.get(rid)
        if (room) {
            room.close()
            this.rooms.delete(room)
            this.idMapRoom.delete(rid)
        }
    }

    syncRoom(rid: number) {
        const room = this.idMapRoom.get(rid)
        if (room) {
            room.sync()
        }
    }

    syncRooms() {
        for (const player of PlayerManager.Instance.players) {
            player.connection.sendMsg(ApiMsgEnum.MsgRoomList, {
                list: this.getRoomsView()
            })
        }
    }

    getRoomView({ id, players, hostUid }: Room) {
        return { id, players: PlayerManager.Instance.getPlayersView(players), hostUid }
    }

    getRoomsView(rooms: Set<Room> = this.rooms) {
        return [...rooms].map(room => this.getRoomView(room))
    }
}
