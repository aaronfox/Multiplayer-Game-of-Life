let CANVAS_WIDTH = 1000
let CANVAS_HEIGHT= 500

var config = {
    type: Phaser.AUTO,
    parent: '#canvas',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#f0ebeb',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};
// Refer to this for scaling game window
// game = new Phaser.Game(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio, Phaser.CANVAS, 'gameArea');

var game = new Phaser.Game(config);
var graphics;
var timedEvent;
var placeButton;
const MAX_TILES_TO_PLACE = 12;
var player = 0;
var socket;

// Radial progress


let hspace = 10;
let size = {
    x: CANVAS_WIDTH / hspace,
    y: (CANVAS_HEIGHT - 50) / hspace
}

function preload() {
    this.load.image('bubble', 'assets/smaller_bubble.png');
}

function create() {
    var self = this;
    this.socket = io();
    socket = this.socket;
    this.otherPlayers = this.add.group();

    // Progress bar
    var image = this.add.image(100, (CANVAS_HEIGHT - (50 / 2)), 'bubble');

    this.tweens.add({
        targets: image,
        x: 400,
        duration: 5000,
        ease: 'Sine.easeInOut',
        loop: -1,
        loopDelay: 0
    });

    var r2 = this.add.circle(405, 475, 20);
    r2.setStrokeStyle(2, 0x1a65ac);
    placeButton = this.add.text(CANVAS_WIDTH / 2 - 115, (CANVAS_HEIGHT - (50 / 2) - 10), 'Step', { fill: '#000000' })

    placeButton = this.add.text(CANVAS_WIDTH / 2, (CANVAS_HEIGHT - (50 / 2)), 'Place Tiles', {fill: '#000000'})
    .setInteractive()
    .on('pointerdown', () => placeTiles())
    .on('pointerover', () => placeButtonHoverState())
    .on('pointerout', () => placeButtonRestState());

    // When a new player is added, add all players including current plauer
    this.socket.on('currentPlayers', function(players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
                player = players[id];
            } else {
                addOtherPlayer(self, players[id]);
                // Draw other players tiles as well
                drawTiles(self, players[id]);
            }
        });
    });

    // When a new player is added, add player to current players of this socket
    this.socket.on('newPlayer', function(playerInfo) {
        addOtherPlayer(self, playerInfo);
    });

    // Remove game object from game
    this.socket.on('disconnected', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    // Draw all other player's tiles with this socket
    this.socket.on('otherTileWasPlaced', function(playerInfo) {
        var color = 0xffffff;
        var thickness = 1;
        var alpha = 1;
        graphics.lineStyle(thickness, color, alpha);
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            console.log('otherPlayer.playerId == ' + otherPlayer.playerId)
            if (playerInfo.playerId === otherPlayer.playerId && player.playerId != otherPlayer.playerId) {
                // Update other player's tiles
                console.log('updating other tiles')
                drawTiles(self, playerInfo);
            }
        });
    });

    this.time.addEvent({ 
        delay: 5000,
        callback: timerEvent,
        callbackScope: this,
        loop: true
    });

    graphics = this.add.graphics({
        lineStyle: {
            width: 1,
            color: 0xffffff,
            alpha: 1
        }
    });

    // Draw initial grid
    for (let ix = 0; ix < size.x; ix++) {
        for (let iy = 0; iy < size.y; iy++) {
            graphics.strokeRect(ix * hspace, iy * hspace, hspace, hspace);
        }
    }

    this.input.on('pointerdown', (pointer) => {
        if (pointer.isDown) {
            var color = 0x4287f5;
            var alpha = 1.0;
            graphics.fillStyle(color, alpha);
            var color = 0x4287f5;
            var thickness = 1;
            var alpha = 1;
            graphics.lineStyle(thickness, color, alpha);
            // Round position to next greatest hspace
            let x = Math.floor(pointer.position.x / hspace) * hspace;
            let y = Math.floor(pointer.position.y / hspace) * hspace;
            // Check for clicking on already existing square so we can remove that square
            containsLocationIndex = getLocationIndex(player.tilesToPlaceLocations, { x: x, y: y });
            if (containsLocationIndex > -1) {
                console.log('removing placed tile')
                player.tilesToPlaceLocations.splice(containsLocationIndex, 1)
                player.tilesToPlace++;
                var color = 0xffffff;
                var thickness = 1;
                var alpha = 1;
                graphics.lineStyle(thickness, color, alpha);
                graphics.strokeRect(x, y, hspace, hspace);

                // Must check if any tiles near this tile. If so, must recolor those as well
                adjacentNeighbors = getAdjacentNeighboringBlocks({ x: x, y: y });
                if (adjacentNeighbors.length > 0) {
                    var color = 0x4287f5;
                    var thickness = 1;
                    var alpha = 1;
                    graphics.lineStyle(thickness, color, alpha);
                    neighbors.forEach(function (element) {
                        graphics.strokeRect(element.x, element.y, hspace, hspace);
                    });
                }
                // End adjacent neighbors check
            } else if (x < size.x * hspace && y < size.y * hspace && player.tilesToPlace > 0) {
                // TODO: Also check if tile is already in placedTileLocations
                // Here, simply include tile in tiles to place array
                // Subtract amount of tiles player can place
                player.tilesToPlace--;
                graphics.strokeRect(x, y, hspace, hspace);
                // Emit placed tile
                player.tilesToPlaceLocations.push({ x: x, y: y });
            }
        }
    })

}

// Returns neighboring blocks of a cell
function getAdjacentNeighboringBlocks(location) {
    // Check up, right, down, left
    var xLocs = [hspace, 0, -1 * hspace, 0]
    var yLocs = [0, hspace, 0, -1 * hspace]
    neighbors = []
    for (var i = 0; i < xLocs.length; i++) {
        currLocation = {x: location.x + xLocs[i], y: location.y + yLocs[i]};
        locationIndex = getLocationIndex(player.tilesToPlaceLocations, currLocation);
        if (locationIndex > -1) {
            // Then add this to neighbors
            neighbors.push(player.tilesToPlaceLocations[locationIndex]);
        }
    }
    return neighbors;
}

// Checks if an array contains x and y locations already
// Returns index of element if found and -1 otherwise
function getLocationIndex(array, location) {
    for (var i = 0; i < array.length; i++) {
        element = array[i];
        if (element.x == location.x && element.y == location.y) {
            return i;
        }
    }
    return -1;
}


function placeButtonHoverState() {
    placeButton.setStyle({ fill: '#f0b207' });
}

function placeButtonRestState() {
    placeButton.setStyle({ fill: '#000' });
}

function drawTiles(self, playerInfo) {
    console.log('drawing tiles!')
    graphics.fillStyle(playerInfo.color, 1.0);
    playerInfo.placedTileLocations.forEach(function(element, index) {
        graphics.strokeRect(element.x, element.y, hspace, hspace);
        graphics.fillRect(element.x, element.y, hspace, hspace);
    });

}

function addPlayer(self, playerInfo) {
    self.test = self.add.image();//'hello';
}

function addOtherPlayer(self, playerInfo) {
    const otherPlayer = self.add.image();//'testOtherPlayer';
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}

function timerEvent(self) {
    console.log('in timerEvent');
}

function placeTiles(self) {
    console.log('in placeTiles')
    // Convert all tiles to place and put in placedTilesLocations
    for (var i = 0; i < player.tilesToPlaceLocations.length; i++) {
        player.placedTileLocations.push(player.tilesToPlaceLocations[i]);
    }
    // Empty out tilesToPlaceLocations
    player.tilesToPlaceLocations = [];
    // TODO: Fill in all placed tiles
    // Placed currently filled tiles
    console.log('huh');
    console.log(player.placedTileLocations);
    placeFilledTiles();
}

function placeFilledTiles(self) {
    var color = 0x4287f5;
    var alpha = 1.0;
    graphics.fillStyle(color, alpha);
    for (var i = 0; i < player.placedTileLocations.length; i++) {
        element = player.placedTileLocations[i];
        graphics.fillRect(element.x, element.y, hspace, hspace);

        // Emit tilePlaced call here
        socket.emit('tilePlaced', { x: element.x, y: element.y })
    }
}

function update() {
    // Progress bar

}