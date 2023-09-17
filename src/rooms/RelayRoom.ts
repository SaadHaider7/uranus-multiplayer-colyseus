import { type, MapSchema, Schema } from '@colyseus/schema';
import { Room, Client } from "@colyseus/core";

class Player extends Schema {
    @type("boolean") connected: boolean;
    @type("string") sessionId: string;
    @type("string") name: string;
    @type("string") avatarUrl: string;
    @type("string") template: string;
    @type("string") username: string;
    @type("number") worldPosX: number;
    @type("number") worldPosY: number;
    @type("number") worldPosZ: number;
}

class RoomState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}

export class RelayRoom extends Room<RoomState> { // tslint:disable-line
    public allowReconnectionTime: number = 0;
    private objectState: any = undefined;

    public getDistanceBetweenPointsSq(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
        const x = x1 - x2;
        const y = y1 - y2;
        const z = z1 - z2;
        return x * x + y * y + z * z;
    }

    public onCreate(options: Partial<{
        maxClients: number,
        allowReconnectionTime: number,
        metadata: any,
        clusterDistance: number
    }>) {

        const clusterDistanceSq = options.clusterDistance * options.clusterDistance;
        this.objectState = {};

        this.setState(new RoomState());

        if (options.maxClients) {
            this.maxClients = options.maxClients;
        }

        if (options.allowReconnectionTime) {
            this.allowReconnectionTime = Math.min(options.allowReconnectionTime, 40);
        }

        if (options.metadata) {
            this.setMetadata(options.metadata);
        }

        this.onMessage('*', (client: Client, type: any, message: any) => {

            // --- intercept server-only messages
            if (type === 'playerUpdate') {
                const player = this.state.players.get(client.sessionId);

                //--- update player properties
                if (message.avatarUrl) player.avatarUrl = message.avatarUrl;
                if (message.name) player.name = message.name;
                return;
            }

            // --- filter messages if required
            if (type === 'chat:message' && message.group) {

                // --- if this is a group chat, broadcast only to group users
                message.group.forEach((clientId: string) => {
                    const receiverClient = this.clients.find(o => o.id === clientId);

                    if (receiverClient) receiverClient.send(type, [client.sessionId, message]);
                });
                return;
            }

            // --- check if it's an object update message
            if (type.indexOf('objectUpdate') === 0) {

                const action = type.split(':')[1];
                let guid;

                switch (action) {
                    case 'request':
                        guid = message;
                        const lastState = this.objectState[guid];                        
                        if (lastState) client.send(`objectUpdate:${guid}`, [client.sessionId, lastState]);
                        break;
                    default:
                        // --- keep track of the latest object state
                        guid = action;
                        this.objectState[guid] = message;
                        break;
                }
            }

            // --- check if the player is close enough to receive the message (only for messages that include world position)
            if (clusterDistanceSq > 0.0 && message.x !== undefined) {

                this.clients.forEach(receipientClient => {

                    if (client.id === receipientClient.id) return true;

                    const player = this.state.players.get(client.sessionId);

                    // --- check player distance against world position
                    // --- if larger than the cluster distance, don't send to this client
                    const playerDistance = this.getDistanceBetweenPointsSq(
                        message.x, message.y, message.z,
                        player.worldPosX, player.worldPosY, player.worldPosZ
                    );

                    if (playerDistance <= clusterDistanceSq) {
                        receipientClient.send(type, [client.sessionId, message]);
                    }

                    // --- save client world location
                    const receipientPlayer = this.state.players.get(receipientClient.sessionId);

                    receipientPlayer.worldPosX = message.x;
                    receipientPlayer.worldPosY = message.y;
                    receipientPlayer.worldPosZ = message.z;
                });
            } else {
                this.broadcast(type, [client.sessionId, message], { except: client });
            }
        });
    }

    public onJoin(client: Client, options: any = {}) {
        const player = new Player();

        player.connected = true;
        player.sessionId = client.sessionId;

        if (options.template) player.template = options.template.toString();
        if (options.username) player.username = options.username.toString();
        if (options.avatarUrl) player.avatarUrl = options.avatarUrl;

        this.state.players.set(client.sessionId, player);
    }

    public async onLeave(client: Client, consented: boolean) {
        if (this.allowReconnectionTime > 0) {
            const player = this.state.players.get(client.sessionId);
            player.connected = false;

            try {
                if (consented) {
                    throw new Error('consented leave');
                }

                await this.allowReconnection(client, this.allowReconnectionTime);
                player.connected = true;

            } catch (e) {
                this.state.players.delete(client.sessionId);
            }
        }
    }

}