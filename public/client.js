const ip = "127.0.0.1";
const port = "5000";

// create the websocket connection
const socket = new WebSocket('ws://' + ip + ':' + port);

// connection opened
socket.addEventListener('open', (event) => {
    socket.send('Hello Server');
})

// incoming message event listner
socket.addEventListener('message', (event) => {
    console.log('[Client]: ' + event.data);
})

const sendMessage = () => {
    socket.send('Hello from client.');
}
