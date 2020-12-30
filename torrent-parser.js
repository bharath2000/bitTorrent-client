'use strict';

const fs = require('fs');
const bencode = require('bencode');
const crypto = require('crypto');
const bignum = require('bignum');


module.exports.open = (filepath) => {
    return bencode.decode(fs.readFileSync(filepath));
};

module.exports.infoHash = (torrent) => {
    const info = bencode.encode(torrent.info);
    return crypto.createHash('sha1').update(info).digest();
};

module.exports.size = torrent => {
    const size = torrent.info.files ? 
        torrent.info.files.map(file => file.length ).reduce((a,b) => a+b ) :
        torrent.info.length;
    return bignum.toBuffer(size, {size : 8});
};

module.exports.BLOCK_LEN = Math.pow(2,14);

module.exports.pieceLen = (torrent, pieceIndex) => {
    const totalLength = bignum.fromBuffer(this.size(torrent)).toNumber();
    const pieceLength = torrent.info['piece length'];

    const lastPieceIndex = Math.floor(totalLength / pieceLength);
    const lastPieceLength = totalLength % pieceLength;
    return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
};
module.exports.blocksPerPiece = (torrent, pieceIndex) => {
    return Math.ceil(this.pieceLen(torrent,pieceIndex) / this.BLOCK_LEN);
};
module.exports.blockLen = (torrent, pieceIndex, blockIndex) => {
    if(blockIndex === Math.floor(this.pieceLen(torrent,pieceIndex) / this.BLOCK_LEN)){
        return this.pieceLen(torrent, pieceIndex) % this.BLOCK_LEN;
    }
    return this.BLOCK_LEN;
};

