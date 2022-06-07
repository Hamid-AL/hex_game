//const _= require("lodash") ;
var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");
let game;

const sqrt_3 = Math.sqrt(3); 
const sqrt_3_halves = sqrt_3 / 2.0;

// Hex radius.
const hex_radius = 32;

// Maximum hex radius.
const max_hex_radius = 32;

// Hex margin.
const hex_margin = 3;

// Board offset.
const board_offset_x = hex_radius * sqrt_3_halves;
const board_offset_y = hex_radius * sqrt_3;

// Currently highlighted hex.
const highlighted_hex = {i : -1, j : -1};

// Default board size.
const board_size_default = 11;
// Desired board size.
let board_size = board_size_default;

// Handles to DOM elements.
let cnvs = undefined; // Canvas.
let ctxt = undefined; // Canvas context.

// Colors.
const color_bg = "#FFFFFF";
const colors_board = [
  "#D0D0D0", // Empty tile.
  "#FF0000", // Player 1.
  "#0000FF"  // Player 2.
];
const colors_board_highlight = [
  "#A0A0A0", // Empty tile.
  "#DD3000", // Player 1.
  "#0030DD"  // Player 2.
];

// Get canvas coordinates of a hexagon.
let hex_to_cnvs = function(i, j, radius, margin) {
  return {
    x : (sqrt_3 * (radius + margin)) * (j + 0.5 * i),
    y : (1.5 * (radius + margin)) * i
  };
};

// Get hex coordinates of a point on canvas.
let cnvs_to_hex = function(x, y, radius, margin) {
  let hex_i = y / (1.5 * (radius + margin));
  let hex_j = x / (sqrt_3 * (radius + margin)) - 0.5 * hex_i;

  return {i : Math.round(hex_i), j : Math.round(hex_j)};
};

let hexa=function  (ctxt, x, y, radius, color){
  let x1 = Math.round(x + radius * sqrt_3_halves);
  let x2 = Math.round(x);
  let x3 = Math.round(x- radius * sqrt_3_halves);

  let y1 = Math.round(y - radius);
  let y2 = Math.round(y - radius * 0.5);
  let y3 = Math.round(y + radius * 0.5);
  let y4 = Math.round(y+ radius);
  ctxt.beginPath();
  ctxt.moveTo(x2, y1);
  ctxt.lineTo(x1, y2);
  ctxt.lineTo(x1, y3);
  ctxt.lineTo(x2, y4);
  ctxt.lineTo(x3, y3);
  ctxt.lineTo(x3, y2);
  ctxt.closePath();

  ctxt.fillStyle = color;
  ctxt.fill();
  ctxt.stroke();
}

let adjacentTiles = function(i, j, size) {
  let tiles = [];

  if (i > 0)
    tiles.push([ i - 1, j ]);
  if (i < size - 1)
    tiles.push([ i + 1, j ]);
  if (j > 0)
    tiles.push([ i, j - 1 ]);
  if (j < size - 1)
    tiles.push([ i, j + 1 ]);
  if (i > 0 && j < size - 1)
    tiles.push([ i - 1, j + 1 ]);
  if (i < size - 1 && j > 0)
    tiles.push([ i + 1, j - 1 ]);

  return tiles;
};

// Board of a hex game.
let HexBoard = function(size) {
  // Size of the board.
  this.size = size;

  // Tiles of the board. Each tile can be either -1 (invalid/out of board), 0
  // (no player), 1 (player 1) or 2 (player 2). Initially, the board is empty,
  // i.e. all zero, but for its boundaries. The boundaries are given to player 1
  // and player 2.
  this.tiles = [];
  for (let i = 0; i < this.size; ++i) {
    this.tiles.push([]);

    for (let j = 0; j < this.size; ++j)
      if ((i == 0 && j == 0) || (i == this.size - 1 && j == this.size - 1))
        this.tiles[i].push(-1);
      else if (i == 0 || i == this.size - 1)
        this.tiles[i].push(1);
      else if (j == 0 || j == this.size - 1)
        this.tiles[i].push(2);
      else
        this.tiles[i].push(0);
  }

  // Apply a move to the board.
  this.move = function(playerside, i, j) {
    // Sanity checks.
    console.assert(playerside == 1 || playerside == 2,
                   "Board.move(): player must be either 1 or 2.");
    console.assert(this.tiles[i][j] == 0, "Board.move(): tile must be empty.");

    // Apply the move.
    this.tiles[i][j] = playerside;
    return true;
  }
  // Check if there exists a path connecting the two edges for a given player.
  this.checkVictory = function(player) {
    // We place a seed on one edge of the board that belongs to the given
    // player. Then we explore the board, starting from that seed, moving only
    // on tiles belonging to that player. If we hit the other side we return
    // true. If we never do, we return false.
    let seed = (player == 1) ? [ 0, 1 ] : [ 1, 0 ];
    let tiles_to_visit = [ seed ];

    let visited = [];
    for (let i = 0; i < this.size; ++i) {
      visited.push([]);
      for (let j = 0; j < this.size; ++j)
        visited[i].push(false);
    }
     
    while (tiles_to_visit.length > 0) {
      // Retrieve next tile to be visited.
      let tile = tiles_to_visit.shift();
      //alert("ha")
      // If it has already been visited, just ignore it and continue.
      if (visited[tile[0]][tile[1]])
        continue;

      // If it has not been visited, but belongs to the "opposite" side, we
      // return true.
      else if ((player == 1 && tile[0] == this.size - 1 &&
                tile[1] < this.size - 1) ||
               (player == 2 && tile[0] < this.size - 1 &&
                tile[1] == this.size - 1))
        return true;

      // In all other cases, we mark it as visited and retrieve the adjacent
      // tiles.
      visited[tile[0]][tile[1]] = true;
      let adjacent = adjacentTiles(tile[0], tile[1], this.size);

      // For each adjacent tile, we check if it belongs to the player. If it
      // does, we append it to the list of tiles to be visited.
      for (let k = 0; k < adjacent.length; ++k)
        if (this.tiles[adjacent[k][0]][adjacent[k][1]] == player)
          tiles_to_visit.push(adjacent[k]);
    }

    return false;

};
};

//Draw board
function draw_board (ctxt, board, last_move ) {
  //if (last_move)
  //console.log("last_move = " + last_move.toString());

  for (let i = 0; i < board.tiles.length; ++i){
    for (let j = 0; j < board.tiles[i].length; ++j){
      if (board.tiles[i][j] >= 0) {
        let xy = hex_to_cnvs(i, j, hex_radius, hex_margin);
        let x = board_offset_x + xy.x;
        let y = board_offset_y + xy.y;
        let stroke_color = undefined;
        
        if (i == 0 || j == 0 || i == board.tiles.length - 1 ||
            j == board.tiles.length - 1)
          stroke_color = "black";
        else if (last_move && i == last_move[1] && j == last_move[2])
          stroke_color = "white";
        else if (i == highlighted_hex.i && j == highlighted_hex.j)
          stroke_color = colors_board[player_side];

        let fill_color = colors_board[board.tiles[i][j]];

        hexa(ctxt, x, y, hex_radius, fill_color);
       } 
      }
    }
};
// Convert player number to string.
let player_to_string = function(player) {
  if (player == 1)
    return "RED";
  else if (player == 2)
    return "BLUE";
  else
    return "undefined";
};

let HexGame = function(board_size) {
  // Game board.
  this.board = new HexBoard(board_size);

  // List of all the moves.
  this.moves = [];

  // Whose turn it is.
  this.turn = 1;

  // Game finished flag.
  this.finished = false;

  // Winner.
  this.winner = 0;

  // Apply a move to the board and go to next player if the move was successful.
  this.move = function(i, j) {
    if (this.board.move(this.turn, i, j)) {
      this.moves.push([ this.turn, i, j ]);
      this.finished = this.board.checkVictory(this.turn);

      if (!this.finished)
        this.turn = this.turn == 1 ? 2 : 1;
      else {
        this.winner = this.turn;
        this.turn = 0;
      }

      return true;
    } else
      return false;
  };
};
let games = [];
let players= function(size_board){
  this.board_size=size_board;
  this.status= undefined;
  this.side=undefined;
}

// Start a new game between two players.
let startGame = function(player1, player2) {
  // Here we increase the size by 2 to account for boundary tiles.
  game = new HexGame(player1.board_size + 2);
  this.gameEntry = [ player1, player2, game ];
  //game.id = newId(games);

  games.push(gameEntry);

  player1.status = "game";
  player2.status = "game";

  player1.side = 1;
  player2.side = 2;

  this.currentplayer=player1.side;
};

// End a game before it's finished.
let endGame = function(game) {
  game[2].turn = 0;

  // Remove the game from the array.
  games = games.filter((g) => { return g[2] !== game[2]; });

  //console.log("[  game-" + game[2].id + "] ending due to: " + reason);
  
};

let gameOver = function(game, player){
  if(game.finished) return player;
  return null;
}

function getRandomInt(max) {
  return Math.floor(1+Math.random() * max);
}



// Execution
//startGame(1,2);
let d=5
let player0= new players(d);
let player00= new players(d);
let Ord= new players (d);
//Ord.side = 3;
startGame(player0, Ord );
//let gam = new HexGame(11);
draw_board(ctx, game.board, [0,0,0]);

/*c.addEventListener('click', e =>{

    //alert(game.turn); 
    let mouse_x = e.clientX ;
    let mouse_y = e.clientY ;
   // hexa(ctx,200 , 100 , hex_radius, "#ff0000");
   hex0 = cnvs_to_hex(mouse_x , mouse_y , hex_radius, hex_margin);
   if(hex0.i-1 > 0 && hex0.i-1<12 && hex0.j>0 && hex0.j< 12 ){
    cv= hex_to_cnvs(hex0.i, hex0.j,  hex_radius, hex_margin)
    //alert(hex0.i +" "+ hex0.j)
    hexa(ctx, cv.x-3 , cv.y +2, hex_radius, "#ff0000");
    game.move(hex0.i-1, hex0.j)
    //if( game.winner==1) alert("bleu wins !")

    if(game.winner ==0){
  
    //worker1.terminate();
    //worker2.terminate();
    //let hi= bestMove(game.board)
    //if(hi != undefined){
    let hi={a:4, b:5}
    game.move(hi.a, hi.b);
    cv= hex_to_cnvs(hi.a+1, hi.b,  hex_radius, hex_margin)
    //cv= hex_to_cnvs(i, j ,  hex_radius, hex_margin)
    hexa(ctx, cv.x-3 , cv.y +2, hex_radius, "#0000ff");
  
    //hexa(ctx, 100 , 100, hex_radius, "#ff0000");
    //if( game.winner==2) alert("IA win")
   
    }
  }
}
//}
 
  
);*/
//hexa(ctx,highlighted_hex.i, highlighted_hex.j , hex_radius, "#00ffcc");
c.addEventListener('click', e =>{
  if(game.currentplayer== 2) {// le bleu
    //alert(game.turn);
    let cnvs_bounding_rect = c.getBoundingClientRect();
    let mouse_x = e.clientX ;
    let mouse_y = e.clientY ;
   // hexa(ctx,200 , 100 , hex_radius, "#00ffff");
   hex0 = cnvs_to_hex(mouse_x , mouse_y , hex_radius, hex_margin);
   if(hex0.i-1 > 0 && hex0.i-1<12 && hex0.j>0 && hex0.j< 12 ){
    cv= hex_to_cnvs(hex0.i, hex0.j,  hex_radius, hex_margin)
    hexa(ctx, cv.x-3 , cv.y +2, hex_radius, "#0000ff");
    game.move(hex0.i-1, hex0.j)
    //alert(game.board.checkVictory(game.currentplayer))
    if( game.winner==2) alert("bleu wins !")
    
    game.currentplayer=1;
  }
}
   
  else{//le rouge
    
    let cnvs_bounding_rect = c.getBoundingClientRect();
    let mouse_x = e.clientX ;
    let mouse_y = e.clientY ;
   // hexa(ctx,200 , 100 , hex_radius, "#00ffff");
   hex0 = cnvs_to_hex(mouse_x , mouse_y , hex_radius, hex_margin);
   if(hex0.i-1 >0 && hex0.i-1<12 && hex0.j>0 && hex0.j< 12 ){
    cv= hex_to_cnvs(hex0.i, hex0.j,  hex_radius, hex_margin)
   
    hexa(ctx, cv.x-3 , cv.y +2, hex_radius, "#ff0000");
    game.move(hex0.i-1, hex0.j)
    if( game.winner==1) alert("red wins !")
    //alert(game.board.checkVictory(game.currentplayer))
    game.currentplayer=2;
  }
}
   
});



