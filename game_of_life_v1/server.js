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

// star variable keeps track of position of star collectibles
var star = {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50
};
// scores variable keeps track of both team's score
var scores = {
    blue: 0,
    red: 0
};

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
            console.log('last!!!');
            // TODO: Reset board since no players left
            // scores.red = 0;
            // scores.blue = 0;
            // star.x = Math.floor(Math.random() * 700) + 50;
            // star.y = Math.floor(Math.random() * 500) + 50;
            // io.emit('starLocation', star);
            // io.emit('scoreUpdate', scores);
        }
        // emit a message to all players to remove this player
        // NOTE: changed this from original
        io.emit('disconnected', socket.id);
    });

    // Sends to all other players that this player placed a new tile
    socket.on('tilePlaced', function(tileData) {
        players[socket.id].placedTileLocations.push(tileData);
        console.log(players[socket.id].placedTileLocations);
        console.log('ahh');
        console.log('in tileplaced in server.js')

        // Emit message to all players that tile was placed
        socket.broadcast.emit('otherTileWasPlaced', players[socket.id])
    })
});

app.get('/multi_game', function (req, res) {
    // res.render('pages/multi_game');
    res.sendFile(__dirname + '/views/pages/multi_game.html');
    // res.sendFile('pages/multi_game.html');

});
// slide = 0
setInterval(step, 5000); // advance slides every 4 seconds

function test() {
    io.sockets.emit('step', 2);
}
// function next() {
//     if (++slide >= slides.length) slide = 0;
//     io.sockets.emit('slide', slide);
// }