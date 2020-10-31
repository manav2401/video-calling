const express = require('express');
const WebSocket = require('ws');
const http = require('http');
var app = null;
var httpServer = null;
var webSockerServer = null;
var connections = [];
var clientId = 0;
var msg = null;
const port = 5000;

function log(text) {
  var time = new Date();
  console.log("[" + time.toLocaleTimeString() + "] [Server]" + text);
}

app = express();
httpServer = http.createServer(app);

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname + '/public' });
})

httpServer.listen(port, () => {
    console.log('Server listening on http://localhost:' + port);
})

webSockerServer = new WebSocket.Server({
  server: httpServer
});

if (!webSockerServer) {
  log('ERROR: Unable to create websocet server');
}

webSockerServer.on('connection', function(ws) {

  var connection = {};
  connection.webSocket = ws;
  connection.clientId = clientId;
  log('Client connected. ID: ' + clientId);
  clientId++;

  // store into connections array
  connections.push(connection);

  // send the client the id assigned
  msg = {
    type: "id",
    id: connection.clientId
  };
  ws.send(JSON.stringify(msg));

  ws.on('message', function(message) {

    // parse the message to json
    var messageReceived = JSON.parse(message);

    // store client id
    if (messageReceived.type === 'normal') {
      log(messageReceived.message + " from " + messageReceived.id);
    }

    if (messageReceived.type === 'video-offer-request') {

      var i;
      var callee = null;

      for (i=0; i<connections.length; i++) {
        if (messageReceived.calleeId === connections[i].clientId) {
          callee = connections[i].webSocket;
          break;
        }
      }

      if (callee) {

        msg = {
          type: "video-answer-request",
          callerId: messageReceived.id,
          offer: messageReceived.offer
        }
        callee.send(JSON.stringify(msg));

      } else {
        // send error message
        msg = {
          type: "error",
          message: "Callee ID " + messageReceived.calleeId + " doesn't exist."
        }
        ws.send(JSON.stringify(msg));

      }

    }

    if (messageReceived.type === 'client-reply') {

      var i;
      var caller = null;

      for (i=0; i<connections.length; i++) {
        if (messageReceived.callerId === connections[i].clientId) {
          caller = connections[i].webSocket;
          break;
        }
      }

      if (caller) {
          msg = {
            type: "server-reply",
            reply: messageReceived.reply,
            calleeId: messageReceived.id,
            answer: messageReceived.answer
          }
          caller.send(JSON.stringify(msg));
      } else {
          msg = {
            type: "error",
            message: "Caller ID " + messageReceived.callerId + " doesn't exist."
          }
          ws.send(JSON.stringify(msg));
      }


    }

  })

  ws.on('close', () => {
    
    // removing the connection from array
    var i;
    for (i=0; i<connections.length; i++) {
      if (ws === connections[i].webSocket) {
        log('Client with ID: ' + connections[i].clientId + ' disconnected.');
        connections.splice(i, 1);
        break;
      }
    }

  })

})



/*
wss.on('connection', (ws) => {

    ws.on('close', () => {
      console.log('[Server]: Client Disconnected');
    })

    ws.on('message', (message) => {
      console.log('[Server]: Received Message: %s', message);
      ws.send('Message Received!');
    });    
  });  */