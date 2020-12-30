'use strict'

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const message = require('./message');
const Pieces = require('./Pieces');
const Queue = require('./Queue');

module.exports = (torrent, path) => {
    
    tracker.getPeers( torrent, peers => {
        console.log(peers);
        const pieces = new Pieces(torrent);
        const file = fs.openSync(path, 'w');
        peers.forEach(peer => download(peer, torrent, pieces, file));
    });
};

function download(peer, torrent, pieces, file) {
    console.log(peer);
    const socket = net.Socket();
    socket.on('error', console.log('error'));
    socket.connect(peer.port, peer.host, ()=>{
        socket.write(message.buildHandshake(torrent));
    });
    const queue = new Queue(torrent);
    onWholeMsg(socket, msg => msgHandler(socket, msg, pieces, queue, file));
}

function msgHandler(socket, msg, pieces, queue, file){
    if(isHandshake(msg)){ 
        socket.write(message.buildInterested());
        console.log('handshaked..');
    }
    else{
        const m = message.parse(msg);

        if(m.id === 0) chokeHandler(socket);
        if(m.id === 1) unchokeHandler(socket, pieces, queue);
        if(m.id === 4) haveHandler(socket, pieces, queue, m.payload);
        if(m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
        if(m.id === 7) pieceHandler(socket, pieces, queue, torrent, file, m.payload);
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
        
        console.log('data receiving');

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
    socket.end();
}
function unchokeHandler(socket,pieces,queue){
    queue.choked = false;
    requestPiece(socket,pieces,queue);
}

function haveHandler(socket, pieces, queue, payload) {
    const pieceIndex = payload.readUInt32BE(0);
    const queueEmpty = queue.length === 0;
    queue.queue(pieceIndex);
    if (queueEmpty) requestPiece(socket, pieces, queue);
}

function bitfieldHandler(socket, pieces, queue, payload) {
    const queueEmpty = queue.length === 0;
    payload.forEach((byte, i) => {
        for (let j = 0; j < 8; j++) {
        if (byte % 2) queue.queue(i * 8 + 7 - j);
        byte = Math.floor(byte / 2);
        }
    });
    if (queueEmpty) requestPiece(socket, pieces, queue);
}

function pieceHandler(socket, pieces, queue, torrent, file, pieceResp) {
    console.log(pieceResp);
    pieces.addReceived(pieceResp);

    //writing into file
    const offset = pieceResp.index * torrent.info['piece length'] + pieceResp.begin;
    fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => {});
  
    if (pieces.isDone()) {
      socket.end();
      console.log('DONE!');
      try { fs.closeSync(file); } catch(e) {}
    } else {
      requestPiece(socket,pieces, queue);
    }
}

function requestPiece(socket, pieces, queue){
    if(queue.choked) return null;
    
    while(queue.length()){
        const pieceBlock = queue.deque();
        if(pieces.needed(pieceBlock)){
            // need to fix this
            socket.write(message.buildRequest(pieceBlock));
            pieces.addRequested(pieceBlock);
            break;
        }
    }
    
}
