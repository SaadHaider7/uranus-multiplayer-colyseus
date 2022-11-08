"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arena_1 = __importDefault(require("@colyseus/arena"));
const monitor_1 = require("@colyseus/monitor");
const RelayRoom_1 = require("./rooms/RelayRoom");
exports.default = arena_1.default({
    getId: () => "Uranus Tools Multiplayer Colyseus Relay Server",
    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define('relay_room_tiny', RelayRoom_1.RelayRoom, {
            maxClients: 10,
            allowReconnectionTime: 3
        }).filterBy(['areaId']);
        gameServer.define('relay_room', RelayRoom_1.RelayRoom, {
            maxClients: 50,
            allowReconnectionTime: 3
        }).filterBy(['areaId']);
        gameServer.define('relay_room_200', RelayRoom_1.RelayRoom, {
            maxClients: 50,
            allowReconnectionTime: 3
        }).filterBy(['areaId']);
        gameServer.define('relay_room_infinity', RelayRoom_1.RelayRoom, {
            maxClients: Infinity,
            allowReconnectionTime: 3
        }).filterBy(['areaId']);
    },
    initializeExpress: (app) => {
        /**
         * Bind your custom express routes here:
         */
        app.get("/", (req, res) => {
            res.send("Uranus Tools Multiplayer Colyseus Relay Server");
        });
        /**
         * Bind @colyseus/monitor
         * It is recommended to protect this route with a password.
         * Read more: https://docs.colyseus.io/tools/monitor/
         */
        app.use("/colyseus", monitor_1.monitor());
    },
    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
