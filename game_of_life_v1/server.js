var express = require('express'),
    app = express()//,
// bodyParser = require('body-parser'),
// methodOverride = require('method-override')

var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 8081));

app.use(express.static(__dirname + '/public'));

// ======================================= BEGIN Multi game logic =======================================
// var server = require('http').Server(app);
// // NOTE: changed this from original
// var io = require('socket.io')(server);

var server = app.listen(app.get('port'));
var io = require('socket.io')(server);

// Keep track of all players in game with players
var players = {};

const MAX_TILES_TO_PLACE = 12;

io.on('connection', function (socket) {
    console.log('a user connected');
    // create a new player and add it to our players object
    players[socket.id] = {
        tilesToPlace: MAX_TILES_TO_PLACE,
        placedTileLocations: [],
        tilesToPlaceLocations: [],
        numberOfTilesOnBoard: 0,
        playerId: socket.id,
        color: '0x' + (Math.floor(Math.random() * 16777215).toString(16))
    };
    // Send the current players to this player socket only
    // Note: socket.emit sends objects to just this socket
    //       while socket.broadcast.emit sends to all other sockets
    socket.emit('currentPlayers', players);

    // send the current scores
    // socket.emit('scoreUpdate', scores);

    // Let all other players know of this new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', function () {
        console.log('user disconnected');
        // remove this player from our players object
        delete players[socket.id];
        // Check if this is last player
        if (players.length == undefined) {
            // Reset board since no players left
            // This is done automatically by logic of game.js
        }
        // emit a message to all players to remove this player
        io.emit('disconnected', socket.id);
    });

    // Sends to all other players that this player placed a new tile
    socket.on('tilePlaced', function(tileData) {
        players[socket.id].placedTileLocations.push(tileData);

        // Emit message to all players that tile was placed
        socket.broadcast.emit('otherTileWasPlaced', players[socket.id])
    })

    // Clears out all previous tiles to clear board of any previously removed
    // tiles that were once placed
    socket.on('clearCells', function () {
        players[socket.id].placedTileLocations = []

        // Emit message to all players to clear out current placedTileLocations array
        socket.broadcast.emit('otherTileWasPlaced', players[socket.id])
    })
});

app.get('/multi_game', function (req, res) {
    // res.render('pages/multi_game');
    res.sendFile(__dirname + '/views/pages/multi_game.html');
    // res.sendFile('pages/multi_game.html');

});
// slide = 0
setInterval(step, 5000); // advance slides every 5 seconds

function step() {
    io.sockets.emit('step', 2);
}