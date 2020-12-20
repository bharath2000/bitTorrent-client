'use strict';
const fs = require('fs');
const bencode = require('bencode');

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;

const torrent = bencode.decode(fs.readFileSync('sample.torrent'));
const url = urlParse(torrent.announce.toString('utf8'));

const socket = dgram.createSocket('udp4');

const msg = Buffer.from('hello?','utf8');

socket.send(msg, 0, msg.length, url.port, url.host, ()=>{});

socket.on('message', msg=>{
    console.log('message is ',msg);
});