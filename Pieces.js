'use strict';

const tp = require('./torrent-parser');

module.exports = class {
    constructor(torrent){

        function buildPiecesArray(){
            const nPieces = torrent.info.pieces.length / 20;
            const arr = new Array(nPieces).fill(null);
            for(let i=0;i<nPieces;i++){
                arr.map( (_,i) =>  new Array(tp.blocksPerPiece(torrent,i)).fill(false));
            }
            return arr;
        }
        this._requested = buildPiecesArray();
        this._received = buildPiecesArray();
    }

    addRequested(pieceBlock){
        const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
        this._requested[pieceBlock][blockIndex]=true;
    }
    addReceived(pieceBlock){
        const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
        this._received[pieceBlock][blockIndex]=true;
    }

    needed(pieceBlock){
        if(this._requested.every( blocks => blocks.every( block => block))){
            this._requested = this._received.map(blocks => blocks.slice());
        }
        const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
        return !this._requested[pieceIndex][blockIndex];
    }

    isDone(){
        return this._requested.every( blocks => blocks.every( block => block));
    }
};