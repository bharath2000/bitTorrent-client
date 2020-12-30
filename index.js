'use strict';

const download = require('./download');
const torrentParser = require('./torrent-parser');

const torrent = torrentParser.open('tears-of-steel.torrent');

download(torrent, torrent.info.name);