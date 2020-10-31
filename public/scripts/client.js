const ip = "127.0.0.1";
const port = "5000";
var myId = null;

function log(text) {
    var time = new Date();
    console.log("[" + time.toLocaleTimeString() + "] [Client]" + text);
}

// create the websocket connection
const socket = new WebSocket('ws://' + ip + ':' + port);

// incoming message event listner
socket.addEventListener('message', (event) => {

    log(event.data);

    // parse the message to json
    var messageReceived = JSON.parse(event.data);

    // store client id
    if (messageReceived.type === 'id') {
        myId = messageReceived.id;
    }

    if (messageReceived.type === 'video-answer-request') {
        log('Offer received form client: ' + messageReceived.callerId);
        
        // prompt user for accept/reject
        var result = confirm('Accept call from client ID: ' + messageReceived.callerId + '?');
        result = result ? "1" : "0";

        var msg = {
            type: "client-reply",
            reply: result,
            id: myId,
            callerId: messageReceived.callerId
        }
        socket.send(JSON.stringify(msg));
    }

    if (messageReceived.type === 'error') {
        log(messageReceived.message);
    }

    if (messageReceived.type === 'server-reply') {
        // reply from server about acceptance/rejection
        if (messageReceived.reply === '1') {
            log('Callee with ID: ' + messageReceived.calleeId + ' accepted your call.');
        } else {
            log('Callee with ID: ' + messageReceived.calleeId + ' rejected your call.');
        }
    }

})

const sendMessage = () => {
    var msg = {
        type: "normal",
        id: myId,
        message: "Hello Server!"
    }
    socket.send(JSON.stringify(msg));
}

const requestCall = () => {
    log('Value entered: ' + document.getElementById('callee-id').value);
    var calleeId = document.getElementById('callee-id').value;
    if (calleeId === '') {
        // empty string
        log('entered empty string!')
    } else {
        calleeId = Number(calleeId);
        var msg = {
            type: "video-offer-request",
            id: myId,
            calleeId: calleeId
        }
        socket.send(JSON.stringify(msg));
    }

}