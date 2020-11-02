// grabbing the packages
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

// app variables
var app = null;
var httpServer = null;
var webSockerServer = null;
var clientId = 0;
var msg = null;

// maintaining the connections array to track client connections
var connections = [];

const PORT = 5000;

// function to log by timestamp
function log(text) {
  var time = new Date();
  console.log("[" + time.toLocaleTimeString() + "] [Server]" + text);
}

// create an express app object
app = express();

// creating http server and passing the express app object
httpServer = http.createServer(app);

// allow the app to load static content
app.use(express.static(path.join(__dirname, "./public")));

// defining the '/' route for loading the base index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "./public/index.html"));
})

// starting the server, listening on `PORT` port.
httpServer.listen(PORT, () => {
  console.log('Server listening on http://localhost:' + PORT);
})

// creating a new websocket server
webSockerServer = new WebSocket.Server({
  server: httpServer
});

if (!webSockerServer) {
  log('ERROR: Unable to create websocet server');
}

// on connection listener
webSockerServer.on('connection', function (ws) {

  // connection has websocket object and ID assigned of the client
  var connection = {};
  connection.webSocket = ws;
  connection.clientId = clientId;
  log('Client connected. ID: ' + clientId);
  clientId++;

  // add the object to the array
  connections.push(connection);

  // send the client with it's assigned client id
  msg = {
    type: "id",
    id: connection.clientId
  };
  ws.send(JSON.stringify(msg));


  // on message listner
  ws.on('message', function (message) {

    // parse the message to json
    var messageReceived = JSON.parse(message);

    // store client id
    if (messageReceived.type === 'normal') {
      log(messageReceived.message + " from " + messageReceived.id);
    }

    // message when caller offers a call to the callee
    if (messageReceived.type === 'video-offer-request') {

      var i;
      var callee = null;

      // find the corresponding callee from the array
      for (i = 0; i < connections.length; i++) {
        if (messageReceived.calleeId === connections[i].clientId) {
          callee = connections[i].webSocket;
          break;
        }
      }

      if (callee) {

        // send the message to corresponding callee
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

    // receives the response of the call offer from callee
    if (messageReceived.type === 'client-reply') {

      var i;
      var caller = null;

      // find the corresponding caller from the array
      for (i = 0; i < connections.length; i++) {
        if (messageReceived.callerId === connections[i].clientId) {
          caller = connections[i].webSocket;
          break;
        }
      }

      if (caller) {

        // sends the response to the corresponding caller
        msg = {
          type: "server-reply",
          reply: messageReceived.reply,
          calleeId: messageReceived.id,
          answer: messageReceived.answer
        }
        caller.send(JSON.stringify(msg));

      } else {

        // sends the error message
        msg = {
          type: "error",
          message: "Caller ID " + messageReceived.callerId + " doesn't exist."
        }
        ws.send(JSON.stringify(msg));
      }

    }

    // receives the call close request from any client
    if (messageReceived.type === 'close-call-client') {

      var i;
      var client = null;

      // finds the other client
      for (i = 0; i < connections.length; i++) {
        if (messageReceived.clientId === connections[i].clientId) {
          client = connections[i].webSocket;
          break;
        }
      }

      if (client) {

        // forwards the message to the corresponding other client
        msg = {
          type: 'close-call-server',
          clientId: messageReceived.id
        };

        client.send(JSON.stringify(msg));

      } else {

        // send error message
        msg = {
          type: "error",
          message: "Callee ID " + messageReceived.calleeId + " doesn't exist."
        }
        ws.send(JSON.stringify(msg));
      }

    }

  })

  // on close event listnet
  ws.on('close', () => {

    // removing the corresponding client connection from array
    var i;
    for (i = 0; i < connections.length; i++) {
      if (ws === connections[i].webSocket) {
        log('Client with ID: ' + connections[i].clientId + ' disconnected.');
        connections.splice(i, 1);
        break;
      }
    }

  })

})