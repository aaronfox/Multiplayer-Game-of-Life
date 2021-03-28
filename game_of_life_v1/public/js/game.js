let CANVAS_WIDTH = 800
let CANVAS_HEIGHT= 600

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

var game = new Phaser.Game(config);
var graphics;
var timedEvent;

let hspace = 10;
let size = {
    x: CANVAS_WIDTH / hspace,
    y: CANVAS_HEIGHT / hspace
}

function preload() {
}

function create() {
    var self = this;
    this.socket = io();
    this.otherPlayers = this.add.group();

    // When a new player is added, add all players including current plauer
    this.socket.on('currentPlayers', function(players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayer(self, players[id]);
                console.log('eep');
                console.log(players[id]);
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
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                // Update other player's tiles
                drawTiles(self, playerInfo);
            }
        });
    });

    // Set timer
    // this.time.addEvent({
    //     callback: this.timerEvent,
    //     callbackScope: this,
    //     delay: 5000, // 5000 = 5 seconds
    //     loop: true
    // });

    // timedEvent = this.time.addEvent(1000, timerEvent, [], this, true);
    this.time.addEvent({ delay: 5000, callback: timerEvent, callbackScope: this, loop: true });



    // timer.start();

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
            // if (iy % 3 == 0) {
            //     var color = 0xffff00;
            //     var alpha = 0.5 + ((4 / 10) * 0.5);
            //     graphics.fillStyle(color, alpha);
            // } else {
            //     var color = 0xAAFF00;
            //     var alpha = 0.5 + ((4 / 10) * 0.5);

            //     graphics.fillStyle(color, alpha);
            // }
            graphics.strokeRect(ix * hspace, iy * hspace, hspace, hspace);
            // graphics.fillRect(ix * hspace, iy * hspace, hspace, hspace);
        }
    }

    // Allows for player to move camera by dragging mouse
    // Note: probably won't allow for this as this makes getting x and y positions of
    // mouse inconsistent
    // this.input.on('pointermove', (pointer) => {
    //     if (pointer.isDown) {
    //         this.cameras.main.scrollX -= (pointer.position.x - pointer.prevPosition.x) * 1.5;
    //         this.cameras.main.scrollY -= (pointer.position.y - pointer.prevPosition.y) * 1.5;
    //     }
    // })

    this.input.on('pointerdown', (pointer) => {
        if (pointer.isDown) {
            var color = 0x4287f5;
            var alpha = 0.75;
            graphics.fillStyle(color, alpha);
            // Round position to next greatest hspace
            let x = Math.floor(pointer.position.x / hspace) * hspace;
            let y = Math.floor(pointer.position.y / hspace) * hspace;
            if (x < size.x * hspace && y < size.y * hspace) {
                graphics.strokeRect(x, y, hspace, hspace);
                graphics.fillRect(x, y, hspace, hspace);
            }
            console.log('pointer.position.x == ' + pointer.position.x);
            console.log('pointer.position.y == ' + pointer.position.y);
            console.log('in')

            // Emit placed tile
            this.socket.emit('tilePlaced', {x: x, y: y})
        }
    })

}

function drawTiles(self, playerInfo) {
    console.log('drawing tiles!')
    console.log(playerInfo)

    graphics.fillStyle(playerInfo.color, 0.75);
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