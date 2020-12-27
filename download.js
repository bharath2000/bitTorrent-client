'use strict'

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const message = require('./message');

module.exports = torrent => {
    const requested = [];
    tracker.getPeers( torrent, peers => {
        peers.forEach(peer => download(peer, torrent, requested));
    });
};

function download(peer, torrent, requested, queue) {
    const socket = net.Socket();
    socket.on('error', console.log('error'));
    socket.connect(peer.port, peer.host, ()=>{
        socket.write(message.buildHandshake(torrent));
    });
    const queue = [];
    onWholeMsg(socket, msg => msgHandler(socket, msg, requested, queue));
}

function msgHandler(socket, msg, requested, queue){
    if(isHandshake(msg)) socket.write(message.buildInterested());
    else{
        const m = message.parse(msg);

        if(m.id === 0) chokeHandler();
        if(m.id === 1) unchokeHandler();
        if(m.id === 4) haveHandler(m.payload, requested, queue);
        if(m.id === 5) bitfieldHandler(m.payload);
        if(m.id === 7) pieceHandler(m.payload, requested, queue);
    }
}

function isHandshake(msg){
    return msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8',1) === 'BitTorrent Protocol';
}

function onWholeMsg(socket, callback){
    let handshake = true;
    let savedBuffer = Buffer.alloc(0);

    socket.on('data', recvBuff => {
        // calculates the length of one whole message
        const msglen = () => handshake ? savedBuffer.readUInt8(0) + 49 : savedBuffer.readUInt32BE(0) + 4 ;
        
        savedBuffer = Buffer.concat([savedBuffer, recvBuff]);

        // for every one whole message data is send to callback
        while(savedBuffer.length >= 4 && savedBuffer.length >= msglen()){
            callback(savedBuffer(0,msglen()));
            savedBuffer = savedBuffer.slice(msglen());
            handshake = false;
        }
    });
}

function chokeHandler(){

}
function unchokeHandler(){

}
function haveHandler(payload, requested, queue){
    const pieceIndex = payload['index'];
    queue.push(pieceIndex);
    if(queue.length === 1){
        requestPiece(payload, requested, queue);
    }
}

function bitfieldHandler(payload){

}
function pieceHandler(payload, requested, queue){
    queue.shift();
    requestPiece(payload, requested, queue);
}
function requestPiece(payload, requested, queue){
    if(requested[queue[0]]){
        queue.shift();
    }else{
        socket.write(message.buildRequest(payload));
        requested[queue[0]] = true;
        queue.shift();
    }
    
}
