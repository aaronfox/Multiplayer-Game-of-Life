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

let hspace = 10;
let size = {
    x: CANVAS_WIDTH / hspace,
    y: (CANVAS_HEIGHT - 50) / hspace
}

function preload() {
}

function create() {
    var self = this;
    this.socket = io();
    this.otherPlayers = this.add.group();

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
            if (playerInfo.playerId === otherPlayer.playerId) {
                // Update other player's tiles
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
            // TODO: also check for clicking on already existing square and then remove that square from 
            console.log('before: ' + player.tilesToPlaceLocations);
            containsLocationIndex = getLocationIndex(player.tilesToPlaceLocations, { x: x, y: y });
            if (containsLocationIndex > -1) {
                console.log('removing placed tile')
                player.tilesToPlaceLocations.splice(containsLocationIndex, 1)
                player.tilesToPlace++;
                // TODO: must check if any tiles near this tile. If so, must recolor those 

                var color = 0xffffff;
                var thickness = 1;
                var alpha = 1;
                graphics.lineStyle(thickness, color, alpha);
                graphics.strokeRect(x, y, hspace, hspace);

                console.log('neighbors == ')
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
            } else if (x < size.x * hspace && y < size.y * hspace && player.tilesToPlace > 0) {
                // Here, simply include tile in tiles to place array
                console.log(player.tilesToPlaceLocations)
                console.log(player.tilesToPlace)
                // Subtract amount of tiles player can place
                player.tilesToPlace--;
                graphics.strokeRect(x, y, hspace, hspace);
                // Emit placed tile
                player.tilesToPlaceLocations.push({ x: x, y: y });

                this.socket.emit('tilePlaced', { x: x, y: y })

                // graphics.fillRect(x, y, hspace, hspace);
            }
            console.log('pointer.position.x == ' + pointer.position.x);
            console.log('pointer.position.y == ' + pointer.position.y);
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


function updateClickCountText() {
    placeButton.setText(`Button has been clicked times.`);
}

function placeButtonHoverState() {
    placeButton.setStyle({ fill: '#f0b207' });
}

function placeButtonRestState() {
    placeButton.setStyle({ fill: '#000' });
}

function drawTiles(self, playerInfo) {
    console.log('drawing tiles!')
    console.log(playerInfo)

    graphics.fillStyle(playerInfo.color, 1.0);
    // graphics.lineStyle(0xffffff);
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
}

function update() {
    // Detect mouse click input
    // if (game.input.mousePointer.isDown) {
    // //     // graphics.fillStyle(0xAAFF00, alpha);
    // //     var color = 0x4287f5;
    // //     var alpha = 0.75;
    // //     graphics.fillStyle(color, alpha);
    // //     graphics.strokeRect(game.input.x * hspace, game.input.y * hspace, hspace, hspace);
    // //     graphics.fillRect(game.input.x * hspace, game.input.y * hspace, hspace, hspace);
    // //     // console.log('out')
    // var color = 0x4287f5;
    // var alpha = 0.75;
    // graphics.fillStyle(color, alpha);
    // // Round position to next greatest hspace
    //     let x = Math.floor(game.input.mousePointer.x / hspace) * hspace;
    //     let y = Math.floor(game.input.mousePointer.y / hspace) * hspace;
    // if (x < size.x * hspace && y < size.y * hspace) {
    //     graphics.strokeRect(x, y, hspace, hspace);
    //     graphics.fillRect(x, y, hspace, hspace);
    // }
    //     console.log('game.input.x== ' + game.input.x);
    //     console.log('game.input.y == ' + game.input.y);
    // console.log('in')
    // }
}



// OLD GAME CODE
// var config = {
//     type: Phaser.AUTO,
//     parent: 'phaser-example',
//     width: 800,
//     height: 600,
//     physics: {
//         default: 'arcade',
//         arcade: { 
//             debug: false,
//             gravity: { y: 0 }
//         }
//     },
//     scene: {
//         preload: preload,
//         create: create,
//         update: update
//     }
// };

// var game = new Phaser.Game(config);

// function preload() { 
//     this.load.image('ship', 'assets/spaceShips_001.png'); 
//     this.load.image('otherPlayer', 'assets/enemyBlack5.png');
//     this.load.image('star', 'assets/star_gold.png');
// }

// function create() {
//     var self = this;
//     this.socket = io();
//     this.otherPlayers = this.physics.add.group();
//     this.socket.on('currentPlayers', function (players) {
//         Object.keys(players).forEach(function (id) {
//             if (players[id].playerId === self.socket.id) {
//                 addPlayer(self, players[id]);
//             } else {
//                 addOtherPlayers(self, players[id]);
//             }
//         });
//     });
//     this.socket.on('newPlayer', function (playerInfo) {
//         addOtherPlayers(self, playerInfo);
//     });
//     this.socket.on('disconnected', function (playerId) {
//         self.otherPlayers.getChildren().forEach(function (otherPlayer) {
//             if (playerId === otherPlayer.playerId) {
//                 otherPlayer.destroy();
//             }
//         });
//     });

//     this.cursors = this.input.keyboard.createCursorKeys();

//     this.socket.on('playerMoved', function (playerInfo) {
//         self.otherPlayers.getChildren().forEach(function (otherPlayer) {
//             if (playerInfo.playerId === otherPlayer.playerId) {
//                 otherPlayer.setRotation(playerInfo.rotation);
//                 otherPlayer.setPosition(playerInfo.x, playerInfo.y);
//             }
//         });
//     });

//     this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
//     this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });

//     this.socket.on('scoreUpdate', function (scores) {
//         self.blueScoreText.setText('Blue: ' + scores.blue);
//         self.redScoreText.setText('Red: ' + scores.red);
//     });

//     this.socket.on('starLocation', function (starLocation) {
//         if (self.star) self.star.destroy();
//         self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
//         self.physics.add.overlap(self.ship, self.star, function () {
//             this.socket.emit('starCollected');
//         }, null, self);
//     });
// }

// function update() { 
//     if (this.ship) {
//         if (this.cursors.left.isDown) {
//             this.ship.setAngularVelocity(-150);
//         } else if (this.cursors.right.isDown) {
//             this.ship.setAngularVelocity(150);
//         } else {
//             this.ship.setAngularVelocity(0);
//         }

//         if (this.cursors.up.isDown) {
//             this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
//         } else {
//             this.ship.setAcceleration(0);
//         }

//         this.physics.world.wrap(this.ship, 5);

//         // emit player movement
//         var x = this.ship.x;
//         var y = this.ship.y;
//         var r = this.ship.rotation;
//         if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
//             this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
//         }

//         // save old position data
//         this.ship.oldPosition = {
//             x: this.ship.x,
//             y: this.ship.y,
//             rotation: this.ship.rotation
//         };
//     }


// }

// function addPlayer(self, playerInfo) {
//     self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
//     if (playerInfo.team === 'blue') {
//         self.ship.setTint(0x0000ff);
//     } else {
//         self.ship.setTint(0xff0000);
//     }
//     self.ship.setDrag(100);
//     self.ship.setAngularDrag(100);
//     self.ship.setMaxVelocity(200);
// }

// function addOtherPlayers(self, playerInfo) {
//     const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
//     if (playerInfo.team === 'blue') {
//         otherPlayer.setTint(0x0000ff);
//     } else {
//         otherPlayer.setTint(0xff0000);
//     }
//     otherPlayer.playerId = playerInfo.playerId;
//     self.otherPlayers.add(otherPlayer);
// }