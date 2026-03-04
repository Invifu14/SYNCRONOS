const io = require("socket.io-client");
const socket1 = io("http://localhost:3000");
const socket2 = io("http://localhost:3000");

socket1.on("connect", () => {
    console.log("User1 connected");
    socket1.emit("join", "User1");
    setTimeout(() => {
        socket1.emit("enviarMensaje", { de: "User1", para: "User2", texto: "Hola Astro2!" });
    }, 1000);
});

socket2.on("connect", () => {
    console.log("User2 connected");
    socket2.emit("join", "User2");
});

socket2.on("nuevoMensaje", (msg) => {
    console.log("User2 received message:", msg);
    process.exit(0);
});
