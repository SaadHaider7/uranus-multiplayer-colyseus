import { type, MapSchema, Schema } from '@colyseus/schema';
import { Room, Client } from "@colyseus/core";

class Player extends Schema {
    @type("boolean") connected: boolean;
    @type("string") sessionId: string;
    @type("string") name: string;
    @type("string") avatarUrl: string;
    @type("string") template: string;
    @type("string") username: string;
}

class RoomState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}

export class RelayRoom extends Room<RoomState> { // tslint:disable-line
    public allowReconnectionTime: number = 0;

    public onCreate(options: Partial<{
        maxClients: number,
        allowReconnectionTime: number,
        metadata: any,
    }>) {
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

        this.onMessage('*', (client: Client, type: string | number, message: any) => {

            // --- intercept server-only messages
            if (type === 'playerUpdate') {
                const player = this.state.players.get(client.sessionId);

                //--- update player properties
                if (message.avatarUrl) player.avatarUrl = message.avatarUrl;
                if (message.name) player.name = message.name;
                return;
            }

            // --- custom code for requesting avatar url from the server
            if(type === 'requestAvatarUrl' && message.sessionId){

                const player = this.state.players.get(message.sessionId);

                if(player) client.send(`receiveAvatarUrl:${message.sessionId}`, [client.sessionId, {avatarUrl: player.avatarUrl}]);
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

            this.broadcast(type, [client.sessionId, message], { except: client });
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