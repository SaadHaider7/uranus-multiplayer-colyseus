"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelayRoom = void 0;
const schema_1 = require("@colyseus/schema");
const core_1 = require("@colyseus/core");
class Player extends schema_1.Schema {
}
__decorate([
    schema_1.type("boolean")
], Player.prototype, "connected", void 0);
__decorate([
    schema_1.type("string")
], Player.prototype, "sessionId", void 0);
__decorate([
    schema_1.type("string")
], Player.prototype, "name", void 0);
__decorate([
    schema_1.type("string")
], Player.prototype, "avatarUrl", void 0);
__decorate([
    schema_1.type("string")
], Player.prototype, "template", void 0);
__decorate([
    schema_1.type("string")
], Player.prototype, "username", void 0);
class RoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
    }
}
__decorate([
    schema_1.type({ map: Player })
], RoomState.prototype, "players", void 0);
class RelayRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.allowReconnectionTime = 0;
    }
    onCreate(options) {
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
        this.onMessage('*', (client, type, message) => {
            // --- intercept server-only messages
            if (type === 'playerUpdate') {
                const player = this.state.players.get(client.sessionId);
                //--- update player properties
                if (message.avatarUrl)
                    player.avatarUrl = message.avatarUrl;
                if (message.name)
                    player.name = message.name;
                return;
            }
            this.broadcast(type, [client.sessionId, message], { except: client });
        });
    }
    onJoin(client, options = {}) {
        const player = new Player();
        player.connected = true;
        player.sessionId = client.sessionId;
        if (options.template)
            player.template = options.template.toString();
        if (options.username)
            player.username = options.username.toString();
        this.state.players.set(client.sessionId, player);
    }
    onLeave(client, consented) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.allowReconnectionTime > 0) {
                const player = this.state.players.get(client.sessionId);
                player.connected = false;
                try {
                    if (consented) {
                        throw new Error('consented leave');
                    }
                    yield this.allowReconnection(client, this.allowReconnectionTime);
                    player.connected = true;
                }
                catch (e) {
                    this.state.players.delete(client.sessionId);
                }
            }
        });
    }
}
exports.RelayRoom = RelayRoom;
