import Arena from "@colyseus/arena";
import { monitor } from "@colyseus/monitor";
import { RelayRoom } from "./rooms/RelayRoom";

export default Arena({
    getId: () => "Uranus Tools Multiplayer Colyseus Relay Server",

    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
         gameServer.define('relay_room_tiny', RelayRoom, {
            maxClients: 10,
            allowReconnectionTime: 3
        }).filterBy(['areaId'])

         gameServer.define('relay_room', RelayRoom, {
            maxClients: 50,
            allowReconnectionTime: 3
        }).filterBy(['areaId'])

        gameServer.define('relay_room_200', RelayRoom, {
            maxClients: 220,
            allowReconnectionTime: 3
        }).filterBy(['areaId'])        

        gameServer.define('relay_room_infinity', RelayRoom, {
            maxClients: Infinity,
            allowReconnectionTime: 3
        }).filterBy(['areaId'])
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
        app.use("/colyseus", monitor());
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});