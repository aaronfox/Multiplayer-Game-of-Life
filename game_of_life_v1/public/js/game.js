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
const MAX_TILES_TO_PLACE = 12;
const STEPS_REQUIRED_TO_INCREMENT_CELLS_TO_PLACE = 5;

var game = new Phaser.Game(config);
var graphics;
var placeButton;
var player = 0;
var socket;
var bubbleTween;
var aliveCellsText;
var cellsLeftToPlaceText;
var steps_since_cell_to_place_incremented = 0;

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

    // Progress bar represented as bubble
    var image = this.add.image(100, (CANVAS_HEIGHT - (50 / 2)), 'bubble');

    bubbleTween = this.tweens.add({
        targets: image,
        x: 400,
        duration: 5000,
        ease: 'Sine.easeInOut',
        loop: -1,
        loopDelay: 0
    });

    var r2 = this.add.circle(405, 475, 20);
    r2.setStrokeStyle(2, 0x1a65ac);

    // Visual texts and buttons to display
    stepText = this.add.text(CANVAS_WIDTH / 2 - 115, (CANVAS_HEIGHT - (50 / 2) - 10), 'Step', { fill: '#000000' })
    aliveCellsText = this.add.text(CANVAS_WIDTH / 2 + 200, (CANVAS_HEIGHT - (50 / 2) - 20), 'Alive Cells: 0', { fill: '#000000' })
    cellsLeftToPlaceText = this.add.text(CANVAS_WIDTH / 2 + 200, (CANVAS_HEIGHT - (50 / 2)), 'Cells to Place: ' + MAX_TILES_TO_PLACE, { fill: '#000000' })

    placeButton = this.add.text(CANVAS_WIDTH / 2, (CANVAS_HEIGHT - (50 / 2) - 10), 'Place Tiles', {fill: '#000000'})
    .setInteractive()
    .on('pointerdown', () => placeTiles())
    .on('pointerover', () => placeButtonHoverState())
    .on('pointerout', () => placeButtonRestState());

    // When a new player is added, add all players including current player
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

    this.socket.on('step', function (playerInfo) {
        bubbleTween.restart();

        // Increment number of cells user can place by one if not already at max tiles to place
        // Ensure to also check current tiles to place as well to make sure user isn't trying to sneak more alive cells in
        // than they're allowed
        if (player.tilesToPlace + player.tilesToPlaceLocations.length < MAX_TILES_TO_PLACE) {
            if (steps_since_cell_to_place_incremented == STEPS_REQUIRED_TO_INCREMENT_CELLS_TO_PLACE) {
                steps_since_cell_to_place_incremented = 0;
                
                // Increment player's cells to place count
                player.tilesToPlace++;
                updateCellsToPlaceText();

            } else {
                steps_since_cell_to_place_incremented++;
            }
        } else {
            steps_since_cell_to_place_incremented = 0;
        }

        // Apply GoL rules here appropriately
        applyGoLRules();
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
                console.log(playerInfo)
                drawTiles(self, playerInfo);
            }
        });
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
                updateCellsToPlaceText();
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
                // Also check if tile is already in placedTileLocations
                // Here, simply include tile in tiles to place array
                // Subtract amount of tiles player can place
                var cellIsDead = true;
                for (var i = 0; i < player.placedTileLocations.length; i++) {
                    if (x == player.placedTileLocations[i].x && y == player.placedTileLocations[i].y) {
                        cellIsDead = false;
                        break;
                    }
                }
                if (cellIsDead) {
                    player.tilesToPlace--;
                    updateCellsToPlaceText();
                    graphics.strokeRect(x, y, hspace, hspace);
                    // Emit placed tile
                    player.tilesToPlaceLocations.push({ x: x, y: y });
                }
            }
        }
    })

}

function redrawGrid() {
    // Draw initial grid
    graphics.clear();
    for (let ix = 0; ix < size.x; ix++) {
        for (let iy = 0; iy < size.y; iy++) {
            graphics.strokeRect(ix * hspace, iy * hspace, hspace, hspace);
        }
    }
    placeFilledTiles();
    drawTilesToPlace();
}

function applyGoLRules() {
    // Clone of grid
    var newTilePlacements = [...player.placedTileLocations]

    if (newTilePlacements.length < 3) {
        newTilePlacements = []
    } else {
        // Iterate through each row of grid
        for (var i = 0; i < CANVAS_WIDTH; i += hspace) {
            // Iterate through each column
            for (var j = 0; j < CANVAS_HEIGHT - 50; j += hspace) {
                // Get number of neighbors for this tile
                currElement = { x: i, y: j };
                numNeighbors = getNumberOfNeighboringBlocks(currElement);

                index = getLocationIndex(player.placedTileLocations, currElement);
                // If cell is alive
                if (index > -1) {
                    if (numNeighbors < 2 || numNeighbors > 3) {
                        // Remove this cell from placedTileLocations since it died
                        for (var k = 0; k < newTilePlacements.length; k++) {
                            if (newTilePlacements[k].x == currElement.x && newTilePlacements[k].y == currElement.y) {
                                newTilePlacements.splice(k, 1);
                                break;
                            }
                        }
                    }
                } else {
                    // Otherwise, this cell is dead and should be alive if 3 neighbors
                    if (numNeighbors == 3) {
                        newTilePlacements.push(currElement);
                    }
                }
            }
        }
    }

    // Now update player data
    player.placedTileLocations = newTilePlacements;

    // Redraw grid and update it
    redrawGrid();

    // Update UI accordingly
    updateAliveCellsText();
    // updateCellsToPlaceText();

    // Make sure to place filled tiles which in turn emits this to other players
    // placeFilledTiles();

    // if (getNumberOfAdjacentNeighboringBlocks(tile) == 2 || getNumberOfAdjacentNeighboringBlocks(tile) == 3) {
    //     console.log(tile.x + ', ' + tile.y + ' lives!');
    // } else {
    //     console.log(tile.x + ', ' + tile.y + ' dies');
    // }

    // Any dead cell with three live neighbors becomes live

    // All other cells die

}

function updateAliveCellsText() {
    aliveCellsText.text = 'Alive Cells: ' + player.placedTileLocations.length;
}

function updateCellsToPlaceText() {
    cellsLeftToPlaceText.text = 'Cells to Place: ' + player.tilesToPlace;
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

// Returns number of neighboring blocks of a cell
function getNumberOfAdjacentNeighboringBlocks(location) {
    // Check up, right, down, left
    var xLocs = [hspace, 0, -1 * hspace, 0]
    var yLocs = [0, hspace, 0, -1 * hspace]
    count = 0
    for (var i = 0; i < xLocs.length; i++) {
        currLocation = { x: location.x + xLocs[i], y: location.y + yLocs[i] };
        locationIndex = getLocationIndex(player.placedTileLocations, currLocation);
        if (locationIndex > -1) {
            count++;
        }
    }
    return count;
}

// Returns number of neighboring blocks of a cell out of 8
function getNumberOfNeighboringBlocks(location) {
    // Check up, up-right, right, down-right, down, down-left, left, up-left
    var xLocs = [hspace, hspace, 0, -1 * hspace, -1 * hspace, -1 * hspace, 0, hspace]
    var yLocs = [0, hspace, hspace, hspace, 0, -1 * hspace, -1 * hspace, -1 * hspace]
    count = 0
    for (var i = 0; i < xLocs.length; i++) {
        currLocation = { x: location.x + xLocs[i], y: location.y + yLocs[i] };
        locationIndex = getLocationIndex(player.placedTileLocations, currLocation);
        if (locationIndex > -1) {
            count++;
        }
    }
    return count;
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
    graphics.fillStyle(playerInfo.color, 1.0);
    playerInfo.placedTileLocations.forEach(function(element, index) {
        graphics.strokeRect(element.x, element.y, hspace, hspace);
        graphics.fillRect(element.x, element.y, hspace, hspace);
    });
}

function drawTilesToPlace(self) {
    var color = 0x4287f5;
    var thickness = 1;
    var alpha = 1;
    graphics.lineStyle(thickness, color, alpha);
    player.tilesToPlaceLocations.forEach(function (element, index) {
        graphics.strokeRect(element.x, element.y, hspace, hspace);
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

// function timerEvent(self) {
//     console.log('in timerEvent');
// }

function placeTiles(self) {
    // Convert all tiles to place and put in placedTilesLocations
    for (var i = 0; i < player.tilesToPlaceLocations.length; i++) {
        player.placedTileLocations.push(player.tilesToPlaceLocations[i]);
    }
    // Empty out tilesToPlaceLocations
    player.tilesToPlaceLocations = [];
    // TODO: Fill in all placed tiles
    // Placed currently filled tiles
    console.log('placed tiles: ')
    console.log(player.placedTileLocations)
    placeFilledTiles();
}

function placeFilledTiles(self) {
    var color = 0x4287f5;
    var alpha = 1.0;
    graphics.fillStyle(color, alpha);
    // First clear out all previous tiles to clear board of any previously removed
    // tiles that were once placed
    socket.emit('clearCells')
    for (var i = 0; i < player.placedTileLocations.length; i++) {
        element = player.placedTileLocations[i];
        graphics.fillRect(element.x, element.y, hspace, hspace);

        // Emit tilePlaced call here
        socket.emit('tilePlaced', { x: element.x, y: element.y })
    }
}

function update() {

}