// defining the host and port of server
const hostname = "localhost";
const port = "5000";

// client side variables
var myId = null;
var getCalled = true;
var isAlreadyCalling = false;
var clientId = null;
var client = null;

// creating an instance of RTC Peer Connection
const { RTCPeerConnection, RTCSessionDescription } = window;
var peerConnection = new RTCPeerConnection();

// create the websocket connection
const socket = new WebSocket("ws://" + hostname + ":" + port);

// get the elements for local and remote video elements
const localVideoeElement = document.getElementById("local-video");
const remoteVideoElement = document.getElementById("remote-video");

// hide the video initially
localVideoeElement.style.visibility = "hidden";
remoteVideoElement.style.visibility = "hidden";

// function to log by timestamp
function log(text) {
  var time = new Date();
  console.log("[" + time.toLocaleTimeString() + "] [Client]" + text);
}

// function to display the client ID assigned by server
async function showClientId() {

  // check if ID is valid
  if (myId != null) {
    const idElement = document.getElementById("client-id");
    const newElement = document.createElement("p");
    newElement.innerHTML = `<h3>Your User ID is ${myId}</h3>`;
    idElement.appendChild(newElement);
  } else {
    console.warn("Unable to fetch client id.");
  }
}

// send message on click event for testing
function sendMessage() {
  var msg = {
    type: "normal",
    id: myId,
    message: "Hello Server!",
  };
  socket.send(JSON.stringify(msg));
};

// call user on click event
function requestCall() {

  log("Value entered: " + document.getElementById("callee-id").value);
  var calleeId = document.getElementById("callee-id").value;

  // check if input is valid or not
  if (calleeId === "") {
    // empty string
    log("entered empty string!");
  } else {
    makeCall(calleeId);
  }

};

// function for initiating the call
async function makeCall(clientId) {

  // create offer and sending to corresponding client
  clientId = Number(clientId);
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(
    new RTCSessionDescription(offer)
  );

  // sending request to server for client ID entered
  var msg = {
    type: "video-offer-request",
    id: myId,
    calleeId: clientId,
    offer: offer,
  };
  socket.send(JSON.stringify(msg));

}

// end call event listner
async function endCallEvent() {
  // flag = 0
  endCall(0);
};

// function for closing the call and updating status and informing peer
async function endCall(flag) {

  // stop the remote video, set stream source to null
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = null;
  }

  // update variables
  getCalled = true;
  isAlreadyCalling = false;

  // hide video elements
  localVideoeElement.style.visibility = "hidden";
  remoteVideoElement.style.visibility = "hidden";

  // set on call message
  const onCallMessage = document.getElementById("on-call-message");
  onCallMessage.innerHTML = `<h3>Disconnected with User ID: ${clientId}</h3>`;

  // clear peer connection
  peerConnection.close();
  peerConnection = null;

  // create new peer connection for future calls
  peerConnection = new RTCPeerConnection();

  // set the local and remote stream listnets
  setStreams();

  if (flag == 0) {
    // send message to other client for closing call
    msg = {
      type: "close-call-client",
      id: myId,
      clientId: clientId,
    };
    socket.send(JSON.stringify(msg));
  }

  // clear the client ID stored
  clientId = null;
}

// sets the remote and local stream on client side
function setStreams() {

  // on track listner, runs when track is obtained from peer
  // stores the stream in source object of HTML element  
  peerConnection.ontrack = function ({ streams: [stream] }) {
    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
    }
  };

  // get audio and video for local stream
  navigator.getUserMedia(
    { video: true, audio: true },
    (stream) => {

      // set the local stream
      const localVideo = document.getElementById("local-video");
      if (localVideo) {
        localVideo.srcObject = stream;
      }
      console.log("User Media Set.");

      // add the tracks to the peer connection for stream transfer
      stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));
    },
    (error) => {
      console.warn(error.message);
    }
  );
}

// incoming message event listner
socket.addEventListener("message", async (event) => {

  // log(event.data);

  // parse the message to json
  var messageReceived = JSON.parse(event.data);

  // store client id
  if (messageReceived.type === "id") {
    myId = messageReceived.id;
    await showClientId();
  }

  // request from caller
  if (messageReceived.type === "video-answer-request") {

    log("Offer received form client: " + messageReceived.callerId);

    var result = "1";
    var answer = null;

    if (getCalled) {

      // prompt user for accept/reject
      result = window.confirm(
        "Accept call from client ID: " + messageReceived.callerId + "?"
      );
      result = result ? "1" : "0";

      if (result === "0") {
        var msg = {
          type: "client-reply",
          reply: result,
          id: myId,
          callerId: messageReceived.callerId,
          answer: null,
        };
        socket.send(JSON.stringify(msg));
      }
    }

    if (result === "1") {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(messageReceived.offer)
      );
      answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(
        new RTCSessionDescription(answer)
      );

      // set variables
      getCalled = false;
      clientId = messageReceived.callerId;

      // show video elements
      localVideoeElement.style.visibility = "visible";
      remoteVideoElement.style.visibility = "visible";

      // set on call message
      const onCallMessage = document.getElementById("on-call-message");
      onCallMessage.innerHTML = `<h3>On call with User ID: ${clientId}</h3>`;

      // send the response back
      var msg = {
        type: "client-reply",
        reply: result,
        id: myId,
        callerId: messageReceived.callerId,
        answer: answer,
      };
      socket.send(JSON.stringify(msg));
    }
  }

  // error message
  if (messageReceived.type === "error") {
    log(messageReceived.message);
  }

  // response from server, regarding acceptance/rejection of call
  if (messageReceived.type === "server-reply") {

    if (messageReceived.reply === "1") {
      log(
        "Callee with ID: " +
        messageReceived.calleeId +
        " accepted your call."
      );

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(messageReceived.answer)
      );

      clientId = messageReceived.calleeId;

      // show video elements
      localVideoeElement.style.visibility = "visible";
      remoteVideoElement.style.visibility = "visible";

      // set on call message
      const onCallMessage = document.getElementById("on-call-message");
      onCallMessage.innerHTML = `<h3>On call with User ID: ${clientId}</h3>`;

      if (!isAlreadyCalling) {
        makeCall(messageReceived.calleeId);
        isAlreadyCalling = true;
      }

    } else {
      log(
        "Callee with ID: " +
        messageReceived.calleeId +
        " rejected your call."
      );
    }
  }

  // request for closing the call
  if (messageReceived.type === "close-call-server") {
    // flag = 1
    endCall(1);
  }

});

// setting the streams initially
setStreams();