"use strict";

/* global core2d */

const { Core2D } = core2d;

var game = {};

game.main = function () {
	this.canvas = document.getElementById("canvas");
	this.context = this.canvas.getContext("2d");
	this.highScore = this.highScore || 0;
	this.jukebox = new Jukebox();
	this.sound = new Sound();
	this.gameState = game.GameState.BOOT;

	window.addEventListener("blur", game.onFocus, false);
	window.addEventListener("click", game.onFocus, false);
	window.addEventListener("focus", game.onFocus, false);
	window.addEventListener("load", game.onFocus, false);
	window.addEventListener("keydown", game.onKeyDown, false);
	window.addEventListener("keyup", game.onKeyUp, false);
	window.addEventListener("resize", game.onResize, false);
	game.onResize();

	this.fireHold = false;
	this.hasDisplayedLink = false;
	this.pauseHold = false;
	this.onFocus();
	const data = Core2D.load();
	game.highScore = data?.highScore || 0;
	game.boot();
};

game.boot = function () {
	const IMAGES = Array.from(document.getElementsByTagName("img"));
	const total = IMAGES.length;
	let complete = 0;

	for (let i = 0; i < IMAGES.length; ++i) {
		const IMAGE = IMAGES[i];

		if (IMAGE.complete) {
			++complete;
		}
	}

	game.context.fillStyle = "blue";
	game.context.fillRect(0, 0, game.canvas.width * complete / total, game.canvas.height);

	if (complete < total) {
		setTimeout(game.boot, 100);
		return;
	}

	game.loop();
};

// Constants
game.ANALOG_TRESHOLD = 0.5;
game.TIMEOUT = 30;
game.HALF_FRAME = Math.floor(game.TIMEOUT / 2);
game.WALKER_FIRE_AGE = 80;
game.WALKER_TURN_CHANCE = 40;
game.WALKER_AIM_TIME = 30;
game.MINE_TOP = 48;
game.MINUTE_MILLISECONDS = 60000;
game.GAME_AREA_HEIGHT = 368;
game.TILE_SIZE = 16;
game.GRID_CELLS = 7;
game.MAX_LIGHT_GUN_SHOTS = 1;
game.MAX_MISSILE_SHOTS = 1;
game.MAX_NORMAL_SHOTS = 2;
game.PLAYER_PATH_PRECISION = 8;
game.MAX_SIDEKICKS = 2;
game.SORTIE_SIZE = 8;
game.SPACE_WHITE = 8;

// Enumerations
game.EnemyState = {
	ENTERING: 0,
	FIRING: 1,
	WAITING: 2,
	UP: 3,
	DOWN: 4,
	FORWARD: 5,
	BACK: 6,
	CHARGING: 7,
	DYING: 8,
	EXPLODING: 9,
	JUMPING: 10
};

game.Enemy = {
	PROPELLER: 0,
	BUG: 1,
	WALKER: 2,
	FROG: 3,
	CANNON: 4,
	MISSILE: 5,
	LADYBUG: 6,
	GHOST: 7,
	SIDE_CANNON: 8,
	LIGHTNING: 9,
	MINE: 10
};

game.PadButtons = {
	FACE_1: 0, // Face (main) buttons
	FACE_2: 1,
	FACE_3: 2,
	FACE_4: 3,
	LEFT_SHOULDER: 4, // Top shoulder buttons
	RIGHT_SHOULDER: 5,
	LEFT_SHOULDER_BOTTOM: 6, // Bottom shoulder buttons
	RIGHT_SHOULDER_BOTTOM: 7,
	SELECT: 8,
	START: 9,
	LEFT_ANALOGUE_STICK: 10, // Analogue sticks (if depressible)
	RIGHT_ANALOGUE_STICK: 11,
	PAD_TOP: 12, // Directional (discrete) pad
	PAD_BOTTOM: 13,
	PAD_LEFT: 14,
	PAD_RIGHT: 15
};

game.PadAxes = {
	LEFT_H: 0,
	LEFT_V: 1,
	RIGHT_H: 2,
	RIGHT_V: 3
};

game.GameState = {
	TRANSITION: 0,
	TITLE: 1,
	INTRO: 2,
	PLAY: 3,
	OVER: 4,
	ENDING: 5,
	HINTS: 6,
	BOOT: 7
};

game.KeyCode = {
	SPACE: 32,
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	D: 68,
	E: 69,
	F: 70,
	I: 73,
	J: 74,
	K: 75,
	L: 76,
	M: 77,
	N: 78,
	P: 80,
	Q: 81,
	R: 82,
	S: 83
};

game.LaserLength = {
	N0: 128,
	N1: 256,
	N2: 512
};

game.LeftOver = {
	"04": "00",
	"05": "00",
	"06": "00",
	"90": "94",
	"91": "94"
};

game.StageState = {
	ENTERING: 0,
	WAVES: 1,
	GROUND: 2,
	STOP: 3,
	BOSS: 4,
	ENDING: 5
};

game.Weapon = {
	SPEED_UP: 0,
	SLOW_DOWN: 1,
	DOWN_TORPEDO: 2,
	UP_TORPEDO: 3,
	NORMAL: 4,
	DUAL: 5,
	TRIPLE: 6,
	QUAD: 7,
	LIGHT_GUN: 8,
	FORCE_FIELD: 9
};

game.FillStyles = new Array();
game.FillStyles[0] = ["Indigo", "DarkRed", "SteelBlue", "Green", "MidnightBlue", "SeaGreen", "Navy", "Maroon"];
game.FillStyles[0][-1] = "Sienna";
game.FillStyles[0][-2] = "Black";
game.FillStyles[0][-3] = "BurlyWood";
game.FillStyles[0][-6] = "LightGrey";
game.FillStyles[1] = ["DarkSlateGrey", "Crimson", "Teal", "DimGrey", "Purple", "RosyBrown", "DarkBlue", "DarkOliveGreen"];
game.FillStyles[1][-1] = "IndianRed";
game.FillStyles[1][-2] = "DarkCyan";
game.FillStyles[1][-3] = "Coral";
game.FillStyles[1][-6] = "LightSlateGrey";
game.AnimatedTiles = ["00", "01", "02", "03", "07", "23", "24", "25", "50", "90", "91", "FF"];
game.HollowTiles = ["00", "01", "02", "03", "07", "08", "09", "14", "15", "16", "17", "18", "20", "21", "22", "23", "24", "25", "26", "27", "44", "45", "46", "50", "74", "75", "94", "95"];
game.FragileTiles = ["19", "38", "68", "90", "91"];

game.StageEnemies = new Array();
game.StageEnemies.push([game.Enemy.BUG, game.Enemy.FROG]); // level 0
game.StageEnemies.push([game.Enemy.BUG, game.Enemy.FROG, game.Enemy.WALKER]); // level 1
game.StageEnemies.push([game.Enemy.BUG, game.Enemy.WALKER]); // level 2
game.StageEnemies.push([game.Enemy.BUG, game.Enemy.WALKER, game.Enemy.FROG, game.Enemy.LADYBUG]); // level 3
game.StageEnemies.push([game.Enemy.FROG, game.Enemy.WALKER, game.Enemy.GHOST]); // level 4
game.StageEnemies.push([game.Enemy.BUG, game.Enemy.LADYBUG, game.Enemy.LIGHTNING]); // level 5
game.StageEnemies.push([game.Enemy.FROG, game.Enemy.MISSILE]); // level 6
game.StageEnemies.push([game.Enemy.BUG, game.Enemy.WALKER, game.Enemy.GHOST]); // level 7
game.StageEnemies[-1] = [game.Enemy.BUG, game.Enemy.FROG, game.Enemy.WALKER]; // secret level -1
game.StageEnemies[-2] = [game.Enemy.BUG, game.Enemy.FROG, game.Enemy.WALKER]; // secret level -2
game.StageEnemies[-3] = [game.Enemy.BUG]; // secret level -3
game.StageEnemies[-6] = [game.Enemy.BUG, game.Enemy.FROG, game.Enemy.MISSILE, game.Enemy.LIGHTNING]; // secret level -6

game.inputUpdate = function () {
	if (getGamepads()[0]) {
		if (getGamepads()[0].buttons[game.PadButtons.START] && getGamepads()[0].buttons[game.PadButtons.START].pressed) {
			game.pauseKey = true;
		} else {
			game.pauseKey = false;
			game.pauseHold = false;
		}

		if (getGamepads()[0].buttons[game.PadButtons.PAD_TOP] && getGamepads()[0].buttons[game.PadButtons.PAD_TOP].pressed || getGamepads()[0].axes[game.PadAxes.LEFT_V] < - game.ANALOG_TRESHOLD) {
			game.upKey = true;
			game.downKey = false;
		} else if (getGamepads()[0].buttons[game.PadButtons.PAD_BOTTOM] && getGamepads()[0].buttons[game.PadButtons.PAD_BOTTOM].pressed || getGamepads()[0].axes[game.PadAxes.LEFT_V] > game.ANALOG_TRESHOLD) {
			game.upKey = false;
			game.downKey = true;
		} else {
			game.upKey = false;
			game.downKey = false;
		}

		if (getGamepads()[0].buttons[game.PadButtons.PAD_LEFT] && getGamepads()[0].buttons[game.PadButtons.PAD_LEFT].pressed || getGamepads()[0].axes[game.PadAxes.LEFT_H] < - game.ANALOG_TRESHOLD) {
			game.leftKey = true;
			game.rightKey = false;
		} else if (getGamepads()[0].buttons[game.PadButtons.PAD_RIGHT] && getGamepads()[0].buttons[game.PadButtons.PAD_RIGHT].pressed || getGamepads()[0].axes[game.PadAxes.LEFT_H] > game.ANALOG_TRESHOLD) {
			game.leftKey = false;
			game.rightKey = true;
		} else {
			game.leftKey = false;
			game.rightKey = false;
		}

		if (getGamepads()[0].buttons[game.PadButtons.FACE_1] && getGamepads()[0].buttons[game.PadButtons.FACE_1].pressed) {
			game.fireKey = true;
		} else {
			game.fireKey = false;
			game.fireHold = false;
		}

		if (getGamepads()[0].buttons[game.PadButtons.FACE_2] && getGamepads()[0].buttons[game.PadButtons.FACE_2].pressed) {
			game.enableKey = true;
		} else {
			game.enableKey = false;
		}
	}
};

game.loop = function () {
	game.inputUpdate();
	game.jukebox.render();
	game.sound.render();
	var startTime = new Date().getTime();

	if (game.gameState != game.oldGameState) {
		game.oldGameState = game.gameState;
		game.renderLoop = 0;

		if (game.gameState == game.GameState.PLAY) {
			if (!game.gamePlay) {
				game.gamePlay = new GamePlay();
			}
		} else if (game.gameState == game.GameState.OVER) {
			if (!game.gameOver) {
				game.gameOver = new GameOver();
			}
		} else if (game.gameState == game.GameState.BOOT) {
			if (!game.gameBoot) {
				game.gameBoot = new GameBoot();
			}
		} else if (game.gameState == game.GameState.TITLE) {
			if (!game.gameTitle) {
				game.gameTitle = new GameTitle();
			}
		} else if (game.gameState == game.GameState.HINTS) {
			if (!game.gameHints) {
				game.gameHints = new GameHints();
			}
		} else if (game.gameState == game.GameState.INTRO) {
			if (!game.gameIntro) {
				game.gameIntro = new GameIntro();
			}
		} else if (game.gameState == game.GameState.ENDING) {
			if (!game.gameEnding) {
				game.gameEnding = new GameEnding();
			}
		} else if (game.gameState == game.GameState.TRANSITION) {
			if (!game.transition) {
				game.transition = new Transition();
			}
		}
	}

	if (game.gameState == game.GameState.PLAY) {
		if (!game.gamePlay.render()) {
			delete game.gamePlay;
		}
	} else if (game.gameState == game.GameState.BOOT) {
		if (!game.gameBoot.render()) {
			delete game.gameBoot;
		}
	} else if (game.gameState == game.GameState.TITLE) {
		if (!game.gameTitle.render()) {
			delete game.gameTitle;
		}
	} else if (game.gameState == game.GameState.OVER) {
		if (!game.gameOver.render()) {
			delete game.gameOver;
		}
	} else if (game.gameState == game.GameState.HINTS) {
		if (!game.gameHints.render()) {
			delete game.gameHints;
		}
	} else if (game.gameState == game.GameState.INTRO) {
		if (!game.gameIntro.render()) {
			delete game.gameIntro;
		}
	} else if (game.gameState == game.GameState.ENDING) {
		if (!game.gameEnding.render()) {
			delete game.gameEnding;
		}
	} else if (game.gameState == game.GameState.TRANSITION) {
		if (!game.transition.render()) {
			delete game.transition;
			game.gameState = game.nextGameState;
		}
	}

	++game.renderLoop;
	var elapsedTime = new Date().getTime() - startTime;
	var timeout = game.TIMEOUT - elapsedTime;

	setTimeout(function () {
		requestAnimationFrame(game.loop);
	}, timeout);
};

game.onFocus = function () {
	window && window.focus();
	this.upKey = false;
	this.downKey = false;
	this.leftKey = false;
	this.rightKey = false;
	this.fireKey = false;
	this.enableKey = false;
	this.pauseKey = false;
};

game.onKeyDown = function (event) {
	var keyCode = event.keyCode;
	event.preventDefault();

	if (keyCode == game.KeyCode.UP || keyCode == game.KeyCode.E || keyCode == game.KeyCode.I) {
		game.upKey = true;
	} else if (keyCode == game.KeyCode.DOWN || keyCode == game.KeyCode.D || keyCode == game.KeyCode.K) {
		game.downKey = true;
	} else if (keyCode == game.KeyCode.LEFT || keyCode == game.KeyCode.S || keyCode == game.KeyCode.J) {
		game.leftKey = true;
	} else if (keyCode == game.KeyCode.RIGHT || keyCode == game.KeyCode.F || keyCode == game.KeyCode.L) {
		game.rightKey = true;
	} else if (keyCode == game.KeyCode.SPACE) {
		game.fireKey = true;
	} else if (keyCode == game.KeyCode.M || keyCode == game.KeyCode.N) {
		game.enableKey = true;
	} else if (keyCode == game.KeyCode.P) {
		game.pauseKey = true;
	}
};

game.onKeyUp = function (event) {
	var keyCode = event.keyCode;
	event.preventDefault();

	if (keyCode == game.KeyCode.UP || keyCode == game.KeyCode.E || keyCode == game.KeyCode.I) {
		game.upKey = false;
	} else if (keyCode == game.KeyCode.DOWN || keyCode == game.KeyCode.D || keyCode == game.KeyCode.K) {
		game.downKey = false;
	} else if (keyCode == game.KeyCode.LEFT || keyCode == game.KeyCode.S || keyCode == game.KeyCode.J) {
		game.leftKey = false;
	} else if (keyCode == game.KeyCode.RIGHT || keyCode == game.KeyCode.F || keyCode == game.KeyCode.L) {
		game.rightKey = false;
	} else if (keyCode == game.KeyCode.SPACE) {
		game.fireKey = false;
		game.fireHold = false;
	} else if (keyCode == game.KeyCode.M || keyCode == game.KeyCode.N) {
		game.enableKey = false;
	} else if (keyCode == game.KeyCode.P) {
		game.pauseKey = false;
		game.pauseHold = false;
	}
};

game.onResize = function () {
	game.canvas.style.width = (window.innerWidth) + "px";
	game.canvas.style.height = (window.innerHeight) + "px";
};

game.clearScreen = function (fillStyle) {
	game.context.fillStyle = fillStyle ? fillStyle : "black";
	game.context.fillRect(0, 0, game.canvas.width, game.canvas.height);
};

game.hash = function (string){
	var result = 0;

	if (string) {
		for (let i = 0; i < string.length; ++i) {
			var digit = string.charCodeAt(i);
			result = ((result << 5) - result) + digit;
			result = result & result; // Convert to 32bit integer
		}
	}

	return result;
};

game.maxShotsForType = function (type) {
	if (type == game.Weapon.NORMAL) {
		return game.MAX_NORMAL_SHOTS;
	}

	return 1;

};

game.random = function (ceiling) {
	return Math.floor(Math.random() * ceiling);
};

game.write = function (text, x, y) {
	var string = "" + text;
	var characters = string.split("");
	var xOffset = x;

	for (let index in characters) {
		var character = characters[index];

		if (character == " ") {
			xOffset += game.SPACE_WHITE;
		} else {
			var characterImage = document.getElementById(character + "Font");
			game.context.drawImage(characterImage, xOffset, y);
			xOffset += characterImage.width;
		}
	}
};

game.writeCenter = function (text, y) {
	var string = "" + text;
	var characters = string.split("");
	var width = 0;

	for (let index in characters) {
		var character = characters[index];

		if (character == " ") {
			width += game.SPACE_WHITE;
		} else {
			var characterImage = document.getElementById(character + "Font");
			width += characterImage.width;
		}
	}

	var x = Math.floor((game.canvas.width - width) / 2);
	game.write(text, x, y);
};

game.writeLeft = function (text, x, y) {
	var string = "" + text;
	var characters = string.split("");
	var xOffset = x;

	for (let index = (characters.length - 1); index >= 0; --index) {
		var character = characters[index];

		if (character == " ") {
			xOffset -= 4;
		} else {
			var characterImage = document.getElementById(character + "Font");
			xOffset -= characterImage.width;
			game.context.drawImage(characterImage, xOffset, y);
		}
	}
};

function Boss(type) {
	this.type = type;
	this.speed = 2;
	this.hitPoints = 40 + (game.gamePlay.story.loop * 10);
	this.age = 0;
	this.dead = false;
	this.state = game.EnemyState.ENTERING;
	this.enteringStyle = game.random(2);
	this.oldState = this.state;
	this.image = document.getElementById("boss0");
	this.boxes = new Array();
	this.boxes.push(new Box(2, 107, 18, 40, true)); // cannon
	this.boxes.push(new Box(20, 83, 31, 26, false)); // front
	this.boxes.push(new Box(140, 18, 93, 49, false)); // sail 1
	this.boxes.push(new Box(102, 67, 100, 42, false)); // sail 2
	this.boxes.push(new Box(38, 109, 137, 81, false)); // core
	this.boxes.push(new Box(224, 132, 40, 21, false)); // tail
	this.boxes.push(new Box(175, 153, 89, 37, false)); // back
	this.boxes.push(new Box(73, 190, 146, 52, false)); // bottom

	var enteringType = game.random(3);

	if (enteringType == 0) {
		this.x = game.canvas.width;
		this.y = game.random(game.GAME_AREA_HEIGHT) - this.image.height;
	} else {
		this.x = game.random(172) + 340;

		if (enteringType == 1) {
			this.y = 0 - this.image.height;
		} else {
			this.y = game.GAME_AREA_HEIGHT;
		}
	}
}

Boss.prototype.render = function () {
	if (this.state != this.oldState) {
		this.oldState = this.state;
		this.age = 0;
	}

	if (this.state == game.EnemyState.ENTERING) {
		if (this.enteringStyle == 0) {
			if (this.x + this.image.width > game.canvas.width - 28 + this.speed) {
				this.x -= (this.speed / 2);
			} else if (this.y + (this.image.height / 2) > (game.GAME_AREA_HEIGHT / 2) + this.speed) {
				this.y -= (this.speed / 2);
			} else if (this.y + (this.image.height / 2) < (game.GAME_AREA_HEIGHT / 2) + this.speed) {
				this.y += (this.speed / 2);
			} else {
				this.state = game.EnemyState.FIRING;
			}
		} else {
			if (this.y + (this.image.height / 2) > (game.GAME_AREA_HEIGHT / 2) + this.speed) {
				this.y -= (this.speed / 2);
			} else if (this.y + (this.image.height / 2) < (game.GAME_AREA_HEIGHT / 2) + this.speed) {
				this.y += (this.speed / 2);
			} else if (this.x + this.image.width > game.canvas.width - 28 + this.speed) {
				this.x -= (this.speed / 2);
			} else {
				this.state = game.EnemyState.FIRING;
			}
		}
	} else if (this.state == game.EnemyState.FIRING) {
		this.fire();
		this.state = game.EnemyState.WAITING;
	} else if (this.state == game.EnemyState.WAITING) {
		if (this.age == 40) {
			if (game.gamePlay.player.y + (game.gamePlay.player.image.height / 2) < this.y + (this.image.height / 2) - this.speed) {
				this.state = game.EnemyState.UP;
			} else if (game.gamePlay.player.y + (game.gamePlay.player.image.height / 2) > this.y + (this.image.height / 2) + this.speed) {
				this.state = game.EnemyState.DOWN;
			} else {
				if (this.y + (this.image.height / 2) - this.speed > game.GAME_AREA_HEIGHT / 2) {
					this.state = game.EnemyState.UP;
				} else {
					this.state = game.EnemyState.DOWN;
				}
			}
		}
	} else if (this.state == game.EnemyState.UP) {
		if (this.age == 0) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 55, this.y + 146));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 67, this.y + 158));
			}
		} else if (this.age == 8) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 79, this.y + 155));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 91, this.y + 167));
			}
		} else if (this.age == 16) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 103, this.y + 164));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 115, this.y + 176));
			}
		} else if (this.age == 24) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 127, this.y + 172));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 139, this.y + 184));
			}
		} else if (this.age == 32) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 151, this.y + 177));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 163, this.y + 189));
			}
		} else if (this.age == 56) {
			this.state = game.EnemyState.FIRING;
		} else {
			this.y -= this.speed;
		}
	} else if (this.state == game.EnemyState.DOWN) {
		if (this.age == 0) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 55, this.y + 146));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 67, this.y + 158));
			}
		} else if (this.age == 8) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 79, this.y + 155));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 91, this.y + 167));
			}
		} else if (this.age == 16) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 103, this.y + 164));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 115, this.y + 176));
			}
		} else if (this.age == 24) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 127, this.y + 172));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 139, this.y + 184));
			}
		} else if (this.age == 32) {
			if (this.type == 4 || this.type == 7) {
				game.gamePlay.enemyFire.projectiles.push(new Enemy(game.Enemy.GHOST, this.x + 151, this.y + 177));
			} else {
				game.gamePlay.enemyFire.projectiles.push(new EnemyShot(this.x + 163, this.y + 189));
			}
		} else if (this.age == 48) {
			this.state = game.EnemyState.FIRING;
		} else {
			this.y += this.speed;
		}
	} else if (this.state == game.EnemyState.DYING) {
		if (this.age == 40) {
			game.jukebox.stop();
			game.sound.play("bossExplosion", 1);
			this.state = game.EnemyState.EXPLODING;
		}
	} else if (this.state == game.EnemyState.EXPLODING) {
		if (this.age == 40) {
			this.dead = true;
			return false;
		}

		let division = this.age / 10;

		if (division == Math.floor(division)) {
			game.gamePlay.smoke.explosions.push(new BigExplosion(this.x + (this.image.width / 2) - 64 + game.random(128), this.y + (this.image.height / 2) - 64 + game.random(128)));
		}
	}

	if (this.state != game.EnemyState.EXPLODING) {
		game.context.drawImage(this.image, this.x, this.y);
		this.flagImage = document.getElementById("flag" + game.gamePlay.globalAnimationFrame);
		game.context.drawImage(this.flagImage, this.x + 195, this.y + 4);
	}

	++this.age;
	return true;
};

Boss.prototype.die = function () {
	game.gamePlay.player.scoreUp(40);
	this.state = game.EnemyState.DYING;
};

Boss.prototype.diminish = function () {
	--this.hitPoints;

	if (this.hitPoints == 0) {
		this.die();
	}
};

Boss.prototype.fire = function () {
	game.sound.play("bossShot0");

	if (this.type == 0 || this.type == 4) {
		game.gamePlay.enemyFire.projectiles.push(new BossShot(this.type, this.x - 32, this.y + 111));
	} else if (this.type == 1 || this.type == 5) {
		for (let angle = 0; angle <= 180; angle += 30) {
			let enemyShot = new EnemyShot(this.x - 8, this.y + 123);
			enemyShot.xSpeed = 0 - (Math.sin(angle * Math.PI / 180) * 6);
			enemyShot.ySpeed = Math.cos(angle * Math.PI / 180) * 6;
			game.gamePlay.enemyFire.projectiles.push(enemyShot);
		}
	} else if (this.type == 2) {
		game.gamePlay.enemyFire.projectiles.push(new BossShot(this.type, this.x - 64, this.y + 95));
	} else if (this.type == 3 || this.type == 7) {
		for (let angle = 0; angle <= 180; angle += 20) {
			let enemyShot = new EnemyShot(this.x - 8, this.y + 123);
			enemyShot.xSpeed = 0 - (Math.sin(angle * Math.PI / 180) * 6);
			enemyShot.ySpeed = Math.cos(angle * Math.PI / 180) * 6;
			game.gamePlay.enemyFire.projectiles.push(enemyShot);
		}
	} else if (this.type == 6) {
		game.gamePlay.enemyFire.projectiles.push(new BossShot(this.type, this.x - 64, this.y + 111));
	}
};

function BossShot(type, x, y) {
	this.type = type;
	this.isBossShot = true;

	if (this.type == 0 || this.type == 4) {
		this.image = document.getElementById("ball");
		this.x = x;
		this.y = y;
		this.speed = 8;
	} else if (this.type == 2) {
		this.image = document.getElementById("snowBall");
		this.x = x;
		this.y = y;
		this.speed = 8;
	} else if (this.type == 6) {
		this.image = document.getElementById("missile");
		this.x = x;
		this.y = y;
		this.speed = 12;
	}
}

BossShot.prototype.render = function () {
	if (this.dead) {
		return false;
	}

	game.context.drawImage(this.image, this.x, this.y);

	if (this.x < -this.image.width || this.y < -this.image.height || this.y > game.GAME_AREA_HEIGHT || this.x > game.canvas.width) {
		this.die();
		return false;
	}

	this.x -= this.speed;
	return true;

};

BossShot.prototype.die = function () {
	this.dead= true;
};

function Box(x, y, width, height, isVulnerable) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.isVulnerable = isVulnerable;
}

function Capsule(x, y) {
	this.x = x;
	this.y = y;
	this.image = document.getElementById("power");
}

Capsule.prototype.render = function () {
	if (this.x + this.image.width < 0) {
		return false;
	} else if (game.gamePlay.player.checkCollision(this.x, this.y, this.image.width, this.image.height, false)) {
		game.sound.play("capsule");
		game.gamePlay.player.scoreUp(1);
		game.gamePlay.player.charge();
		return false;
	}

	game.context.drawImage(this.image, this.x, this.y);
	this.x -= game.gamePlay.speed;
	return true;

};

function Enemy(type, x, y, sortie) {
	this.type = type;
	this.sortie = sortie;
	this.dead = false;
	this.style;
	this.age = 0;
	this.state;
	this.oldState;
	this.frameCounter = 0;
	this.frameLasting = 3;
	this.lastingCounter = 0;

	if (type == game.Enemy.PROPELLER) {
		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			this.x = game.canvas.width;
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = game.random(game.GAME_AREA_HEIGHT - 15) + 16;
		}

		this.style = game.random(game.PROPELLER_STYLES);
		this.frames = new Array();
		this.frames.push(document.getElementById("sortie00"));
		this.frames.push(document.getElementById("sortie01"));
		this.frames.push(document.getElementById("sortie02"));
		this.frames.push(document.getElementById("sortie03"));
		this.image = this.frames[0];
		this.speed = 4;
	} else if (type == game.Enemy.BUG) {
		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			this.x = game.canvas.width;
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = game.random(320);
		}

		this.centerFrame = document.getElementById("bug");
		this.upFrame = document.getElementById("bugUp");
		this.downFrame = document.getElementById("bugDown");
		this.image = this.centerFrame;
		this.xSpeed = 3;
		this.ySpeed = 1;
	} else if (type == game.Enemy.WALKER) {
		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			if (game.random(3) == 1) {
				this.x = -32;
			} else {
				this.x = game.canvas.width;
			}
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = 306;
		}

		this.frames = new Array();
		this.frames.push(document.getElementById("walkerLeft0"));
		this.frames.push(document.getElementById("walkerLeft1"));
		this.fireFrame = document.getElementById("walkerLeftFire");
		this.rightFrames = new Array();
		this.rightFrames.push(document.getElementById("walkerRight0"));
		this.rightFrames.push(document.getElementById("walkerRight1"));
		this.rightFireFrame = document.getElementById("walkerRightFire");
		this.image = this.frames[0];
		this.speed = 3;
		this.ySpeed = 0;
		this.aiming = false;
		this.rightDirection = false;
		this.aimingCounter = 0;
		this.fastTurn = 0;
		this.offset = 0;

		if (this.x < (game.canvas.width / 2)) {
			this.rightDirection = true;
		}
	} else if (type == game.Enemy.FROG) {
		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			this.x = game.canvas.width;
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = 290;
		}

		this.frame = document.getElementById("frog");
		this.jumpFrame = document.getElementById("frogJump");
		this.image = this.frame;
		this.state = game.EnemyState.ENTERING;
		this.xSpeed = 0;
		this.ySpeed = 0;
	} else if (type == game.Enemy.CANNON) {
		this.leftImage = document.getElementById("cannonLeft");
		this.rightImage = document.getElementById("cannonRight");
		this.image = this.leftImage;
		this.rightDirection = false;
		this.hitPoints = 6 + game.gamePlay.story.loop;

		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			this.x = game.canvas.width;
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = 304;

			while (game.gamePlay.ground.checkCollision(this.x, this.y, this.image.width, this.image.height - 1) > 0) {
				this.y -= game.TILE_SIZE;
			}
		}
	} else if (type == game.Enemy.MISSILE) {
		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			this.x = game.canvas.width;
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = game.random(320);
		}

		this.image = document.getElementById("missile");
		this.speed = 4;
	} else if (type == game.Enemy.LADYBUG) {
		this.x;
		this.y;
		this.state;

		if (typeof(x) != "undefined" && typeof(y) != "undefined") {
			this.x = x;
			this.y = y;
		} else if (typeof(x) != "undefined") {
			this.x = x;

			if (game.random(2) == 1) {
				this.y = -32;
				this.state = game.EnemyState.DOWN;
			} else {
				this.y = game.GAME_AREA_HEIGHT;
				this.state = game.EnemyState.UP;
			}
		} else if (typeof(y) != "undefined") {
			this.y = y;

			if (game.random(2) == 1) {
				this.x = -32;
				this.state = game.EnemyState.BACK;
			} else {
				this.y = game.canvas.width;
				this.state = game.EnemyState.FORWARD;
			}
		} else {
			switch (game.random(4)) {
			case 0:
				this.x = game.canvas.width;
				this.y = game.random(game.GAME_AREA_HEIGHT - 32);
				this.state = game.EnemyState.FORWARD;
				break;
			case 1:
				this.x = -32;
				this.y = game.random(game.GAME_AREA_HEIGHT - 32);
				this.state = game.EnemyState.BACK;
				break;
			case 2:
				this.x = game.random(game.canvas.width - 32);
				this.y = -32;
				this.state = game.EnemyState.DOWN;
				break;
			case 3:
				this.x = game.random(game.canvas.width - 32);
				this.y = game.GAME_AREA_HEIGHT;
				this.state = game.EnemyState.UP;
				break;
			}
		}

		this.leftFrame = document.getElementById("ladyBugLeft");
		this.rightFrame = document.getElementById("ladyBugRight");
		this.upFrame = document.getElementById("ladyBugUp");
		this.downFrame = document.getElementById("ladyBugDown");
		this.image = this.leftFrame;
		this.speed = 3;
	} else if (type == game.Enemy.GHOST) {
		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			this.x = game.canvas.width;
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = game.random(game.GAME_AREA_HEIGHT - 15);
		}

		this.frames = new Array();
		this.frames.push(document.getElementById("ghost0"));
		this.frames.push(document.getElementById("ghost1"));
		this.image = this.frames[0];
		this.xSpeed = 4;
		this.ySpeed = 0;
		this.state = game.EnemyState.DOWN;
	} else if (type == game.Enemy.SIDE_CANNON) {
		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			this.x = game.canvas.width;
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = 272;
		}

		this.image = document.getElementById("sideCannon");
		this.hitPoints = 8 + (game.gamePlay.story.loop * 2);
	} else if (type == game.Enemy.LIGHTNING) {
		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			this.x = game.canvas.width;
			this.x = game.random(game.canvas.width);
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = -32;
		}

		this.image = document.getElementById("lightning");
		this.xSpeed = 3 + game.random(4);
		this.ySpeed = 6 + game.random(7);
		game.sound.play("lightning");
	} else if (type == game.Enemy.MINE) {
		this.image = document.getElementById("mine");
		this.speed = 1;

		if (typeof(x) != "undefined") {
			this.x = x;
		} else {
			this.x = game.canvas.width;
		}

		if (typeof(y) != "undefined") {
			this.y = y;
		} else {
			this.y = game.MINE_TOP + game.random(game.GAME_AREA_HEIGHT - game.MINE_TOP - this.image.height);
		}
	}

	this.oldState = this.state;
}

Enemy.prototype.render = function () {
	if (this.dead || this.x + this.image.width < 0 || this.x > game.canvas.width || this.y + this.image.height < 0 || this.y > game.GAME_AREA_HEIGHT) {
		return false;
	}

	if (this.state != this.oldState) {
		this.oldState = this.state;
		this.age = 0;
	}

	if (this.type == game.Enemy.PROPELLER) {
		if (this.age < (300 / this.speed)) {
			this.x -= this.speed;
		} else if (this.age < (360 / this.speed)) {
			this.x += this.speed;

			if (this.sortie.mode == 0) {
				this.y -= this.speed;
			} else {
				this.y += this.speed;
			}
		} else if (this.age < (480 / this.speed)) {
			this.x -= this.speed;
		} else if (this.age < (540 / this.speed)) {
			this.x += this.speed;

			if (this.sortie.mode == 0) {
				this.y -= this.speed;
			} else {
				this.y += this.speed;
			}
		} else if (this.age == (540 / this.speed) && game.gamePlay.story.loop > 0) {
			this.fire();
		} else {
			this.x += this.speed;
		}
	} else if (this.type == game.Enemy.BUG) {
		this.x -= this.xSpeed;

		if (this.y > game.gamePlay.player.y + this.ySpeed) {
			this.image = this.upFrame;
			this.y -= this.ySpeed;
		} else if (this.y < game.gamePlay.player.y - this.ySpeed && this.y < game.GAME_AREA_HEIGHT - this.image.height) {
			this.image = this.downFrame;
			this.y += this.ySpeed;
		} else {
			this.image = this.centerFrame;
			this.x -= this.xSpeed;
		}

		if (this.age == (game.canvas.width / (this.xSpeed + this.ySpeed) / game.gamePlay.story.loop)) {
			this.fire();
		}
	} else if (this.type == game.Enemy.WALKER) {
		if (this.aimingCounter > game.WALKER_AIM_TIME) {
			this.aimingCounter = 0;
			this.aiming = false;
		} else {
			let division = this.age / game.WALKER_FIRE_AGE;

			if (division != 0 && division == Math.floor(division)) {
				this.aiming = true;
			}
		}

		if (this.aiming) {
			this.x -= game.gamePlay.speed;

			if (this.x < game.gamePlay.player.x) {
				this.rightDirection = true;
			} else {
				this.rightDirection = false;
			}

			if (this.rightDirection) {
				this.image = this.rightFireFrame;

				if (this.aimingCounter == 25) {
					this.fire(this.x + this.image.width, this.y);
				}
			} else {
				this.image = this.fireFrame;

				if (this.aimingCounter == 25) {
					this.fire(this.x - 4, this.y);
				}
			}

			++this.aimingCounter;
		} else {
			if (!game.gamePlay.ground.checkCollision(this.x, this.y + 30, 32, 2) > 0) {
				this.y += 16;
			}

			if (game.gamePlay.ground.checkCollision(this.x, this.y, 32, 16) > 0) {
				if (game.gamePlay.ground.checkCollision(this.x + (this.rightDirection ? 16 : 0), this.y - 32, 16, 16) > 0) {
					this.rightDirection = !this.rightDirection;
					this.x += this.rightDirection ? 1 : -1;

					if (++this.fastTurn > 2) {
						this.die();
					}
				} else {
					this.y -= 16;
					this.fastTurn = 0;
				}
			}

			if (this.age > 120 && game.random(game.WALKER_TURN_CHANCE) == 1) { // turn age & turn chance
				this.rightDirection = !this.rightDirection;
			}

			this.y += this.ySpeed;

			if (this.rightDirection) {
				this.x += this.speed - game.gamePlay.speed;
			} else {
				this.x -= this.speed + game.gamePlay.speed;
			}
		}
	} else if (this.type == game.Enemy.FROG) {
		if (this.state == game.EnemyState.ENTERING) {
			if (game.gamePlay.ground.checkCollision(this.x, this.y, 32, 29) > 0) {
				this.y -= game.TILE_SIZE;
			} else {
				this.jump();
			}
		} else if (this.state == game.EnemyState.WAITING) {
			this.x -= game.gamePlay.speed;
			let division = this.age / 60;

			if (division != 0 && division == Math.floor(division)) {
				this.fire(this.x, this.y - 4);
			} else {
				let division = this.age / 100;

				if (division != 0 && division == Math.floor(division)) {
					this.jump();
				}
			}
		} else if (this.state == game.EnemyState.JUMPING) {
			this.x -= this.xSpeed;
			this.y -= this.ySpeed;

			if (this.ySpeed < 0 && game.gamePlay.ground.checkCollision(this.x + 8, this.y + 24, 16, 8) > 0) {
				this.image = this.frame;
				this.state = game.EnemyState.WAITING;
			}

			--this.ySpeed;
		}
	} else if (this.type == game.Enemy.CANNON) {
		this.x -= game.gamePlay.speed;

		if (this.x < game.gamePlay.player.x - 16) {
			this.image = this.rightImage;
			this.rightDirection = true;
		} else {
			this.image = this.leftImage;
			this.rightDirection = false;
		}

		let division = this.age / 60;

		if (division != 0 && division == Math.floor(division)) {
			this.fire(this.x + ((this.rightDirection) ? this.image.width - 8 : 0), this.y);
		}
	} else if (this.type == game.Enemy.MISSILE) {
		this.x -= this.speed;
	} else if (this.type == game.Enemy.LADYBUG) {
		switch (this.state) {
		case game.EnemyState.FORWARD:
			this.x -= this.speed;
			this.image = this.leftFrame;
			break;
		case game.EnemyState.BACK:
			this.x += this.speed;
			this.image = this.rightFrame;
			break;
		case game.EnemyState.UP:
			this.y -= this.speed;
			this.image = this.upFrame;
			break;
		case game.EnemyState.DOWN:
			this.y += this.speed;
			this.image = this.downFrame;
			break;
		}
	} else if (this.type == game.Enemy.GHOST) {
		this.x -= this.xSpeed;
		this.y += this.ySpeed;
		this.image = this.frames[game.gamePlay.globalAnimationFrame];

		if (this.state == game.EnemyState.DOWN) {
			if (++this.ySpeed > 6) {
				this.state = game.EnemyState.UP;
			}
		} else {
			if (--this.ySpeed < -6) {
				this.state = game.EnemyState.DOWN;
			}
		}
	} else if (this.type == game.Enemy.SIDE_CANNON) {
		this.x -= game.gamePlay.speed;
		let division = this.age / 30;

		if (game.gamePlay.player.x + game.gamePlay.player.image.width < this.x && division == Math.floor(division)) {
			this.fire(this.x, this.y + 28);
		}
	} else if (this.type == game.Enemy.LIGHTNING) {
		this.x -= this.xSpeed;
		this.y += this.ySpeed;
	} else if (this.type == game.Enemy.MINE) {
		this.x -= game.gamePlay.speed;

		if (game.gamePlay.ground.checkCollision(this.x, this.y, this.image.width, this.image.height) > 0) {
			// do nothing
		} else {
			if (this.y > game.MINE_TOP && this.y > game.gamePlay.player.y + this.speed) {
				this.y -= this.speed;
			} else if (this.y < game.gamePlay.player.y - this.speed) {
				this.y += this.speed;
			}

			if (this.x > game.gamePlay.player.x + this.speed) {
				this.x -= this.speed;
			} else if (this.x < game.gamePlay.player.x - this.speed) {
				this.x += this.speed;
			}
		}
	}

	if (!this.aiming && this.frames) {
		if (this.lastingCounter > this.frameLasting) {
			this.lastingCounter = 0;
			++this.frameCounter;
		} else {
			++this.lastingCounter;
		}

		if (this.frameCounter == this.frames.length) {
			this.frameCounter = 0;
		}

		if (this.rightDirection) {
			this.image = this.rightFrames[this.frameCounter];
		} else {
			this.image = this.frames[this.frameCounter];
		}
	}

	game.context.drawImage(this.image, this.x, this.y);
	++this.age;
	return true;
};

Enemy.prototype.jump = function () {
	if (this.type == game.Enemy.FROG) {
		this.xSpeed = game.gamePlay.speed + game.random(8);
		this.ySpeed = 6 + game.random(8);
		this.image = this.jumpFrame;
		this.state = game.EnemyState.JUMPING;
	}
};

Enemy.prototype.fire = function (xTuning, yTuning) {
	var x;
	var y;

	if (xTuning) {
		x = xTuning;
	} else {
		x = this.x + (this.image.width / 2);
	}

	if (yTuning) {
		y = yTuning;
	} else {
		y = this.y + (this.image.height / 2);
	}

	game.gamePlay.enemyFire.projectiles.push(new EnemyShot(x, y));
};

Enemy.prototype.diminish = function () {
	--this.hitPoints;

	if (this.hitPoints == 0) {
		this.die();
	}
};

Enemy.prototype.die = function () {
	this.dead = true;

	if (this.type == game.Enemy.CANNON || this.type == game.Enemy.SIDE_CANNON) {
		game.sound.play("bigExplosion");
		game.gamePlay.player.scoreUp(6);
		game.gamePlay.smoke.explosions.push(new BigExplosion(this.x + (this.image.width / 2), this.y + (this.image.height / 2)));
	} else if (this.sortie) {
		game.sound.play("enemyExplosion");
		game.gamePlay.player.scoreUp(1);

		if (++this.sortie.casualities == 8) {
			game.gamePlay.player.scoreUp(1);
			game.gamePlay.smoke.explosions.push(new Explosion(this.x, this.y, true));
		} else {
			game.gamePlay.smoke.explosions.push(new Explosion(this.x, this.y, false));
		}
	} else {
		game.sound.play("enemyExplosion");
		game.gamePlay.player.scoreUp(1);

		if (this.type == game.Enemy.LIGHTNING) {
			game.gamePlay.player.scoreUp(4);
		}

		game.gamePlay.smoke.explosions.push(new Explosion(this.x, this.y, game.random(5 + game.gamePlay.story.loop) == 1 ? true : false));
	}
};

function EnemyShot(x, y) {
	this.x = x;
	this.y = y;
	this.dead = false;
	this.image = document.getElementById("enemyShot");
	var xTarget = game.gamePlay.player.x + (game.gamePlay.player.image.width / 2);
	var yTarget = game.gamePlay.player.y + (game.gamePlay.player.image.height / 2);
	var squareDistance = Math.abs(this.x - xTarget) + Math.abs(this.y - yTarget);
	this.xSpeed = (xTarget - this.x) / squareDistance * 6; // EnemyShot speed
	this.ySpeed = (yTarget - this.y) / squareDistance * 6; // EnemyShot speed
}

EnemyShot.prototype.render = function () {
	if (this.dead) {
		return false;
	} else if (this.x < -this.image.width || this.y < -this.image.height || this.y > game.GAME_AREA_HEIGHT || this.x > game.canvas.width) {
		this.die();
		return false;
	} else if (game.gamePlay.ground.checkCollision(this.x, this.y, this.image.width, this.image.height) > 0) {
		this.die();
		return false;
	}

	this.x += this.xSpeed;
	this.y += this.ySpeed;
	game.context.drawImage(this.image, this.x, this.y);
	return true;

};

EnemyShot.prototype.die = function () {
	this.dead = true;
};

function Secret(x, y) {
	this.x = x;
	this.y = y;
	this.image = document.getElementById("secret");
}

Secret.prototype.render = function () {
	if (this.x + this.image.width < 0) {
		return false;
	} else if (game.gamePlay.player.checkCollision(this.x, this.y, this.image.width, this.image.height, false)) {
		game.sound.play("secret");
		const searchParams = new URLSearchParams(location.search);
		game.gamePlay.story.secret = searchParams.has("games") && JSON.parse(searchParams.get("games")).includes("cityscape");
		return false;
	}

	game.context.drawImage(this.image, this.x, this.y);
	this.x -= game.gamePlay.speed;
	return true;
};

function Snowflake() {
	this.x = game.random(game.canvas.width + 16) - 16;
	this.y = -16;
	this.dead = false;
	this.image = document.getElementById("snowflake");
	this.xSpeed = game.random(4) - 2;
	this.ySpeed = game.random(2) + 2;
	this.offset = 0;
}

Snowflake.prototype.render = function () {
	if (this.dead) {
		return false;
	}

	if (this.x < -this.image.width || this.x > game.canvas.width || this.y > game.GAME_AREA_HEIGHT) {
		this.die();
		return false;
	} else if (game.gamePlay.ground.checkCollision(this.x + 2, this.y, this.image.width - 4, this.image.height) > 0) {
		if (!game.gamePlay.player.checkCollision(this.x - this.image.width, this.y - this.image.height, this.image.width * 3, this.image.height * 3, false)) {
			this.freeze();
		}

		return false;
	}

	this.x += this.xSpeed;
	this.y += this.ySpeed;
	game.context.drawImage(this.image, this.x, this.y);
	return true;

};

Snowflake.prototype.freeze = function () {
	do {
		--this.y;
		++this.offset;
	} while (game.gamePlay.ground.checkCollision(this.x, this.y, this.image.width, this.image.height) > 0);

	++this.y;

	if (this.offset < 16) {
		game.gamePlay.ground.tiles.push(new Tile(68, this.x, this.y));
		this.die();
	}
};

Snowflake.prototype.die = function () {
	this.dead = true;
};

function BigExplosion(x, y) {
	this.x = x - 64;
	this.y = y - 64;
	this.frameCounter = 0;
	this.frameLasting = 5;
	this.lastingCounter = 0;
	this.frames = new Array();
	var style = game.random(2);
	this.frames.push(document.getElementById("bigExplosion" + style + "0"));
	this.frames.push(document.getElementById("bigExplosion" + style + "1"));
	this.frames.push(document.getElementById("bigExplosion" + style + "2"));
}

BigExplosion.prototype.render = function () {
	if (this.lastingCounter > this.frameLasting) {
		this.lastingCounter = 0;
		++this.frameCounter;
	} else {
		++this.lastingCounter;
	}

	if (this.frameCounter == this.frames.length) {
		this.die();
		return false;
	}

	this.x -= game.gamePlay.speed;
	game.context.drawImage(this.frames[this.frameCounter], this.x, this.y);
	return true;

};

BigExplosion.prototype.die = function () {
};

function Explosion(x, y, dropCapsule) {
	this.x = x;
	this.y = y;
	this.dropCapsule = dropCapsule;
	this.frameCounter = 0;
	this.frameLasting = 3;
	this.lastingCounter = 0;
	this.image;
	this.frames = new Array();
	this.frames.push(document.getElementById("explosion0"));
	this.frames.push(document.getElementById("explosion1"));
	this.frames.push(document.getElementById("explosion2"));
	this.frames.push(document.getElementById("explosion3"));
}

Explosion.prototype.render = function () {
	if (this.lastingCounter > this.frameLasting) {
		this.lastingCounter = 0;
		++this.frameCounter;
	} else {
		++this.lastingCounter;
	}

	if (this.frameCounter == this.frames.length) {
		this.die();
		return false;
	}

	this.x -= game.gamePlay.speed;
	this.image = this.frames[this.frameCounter];
	game.context.drawImage(this.image, this.x, this.y);
	return true;

};

Explosion.prototype.die = function () {
	if (this.dropCapsule && !game.gamePlay.ground.checkCollision(this.x + 4, this.y + 4, this.image.width - 8, this.image.height - 8)) {
		var capsule = new Capsule(this.x, this.y);
		game.gamePlay.loot.capsules.push(capsule);
	}
};

function TinyExplosion(x, y) {
	this.x = x - 8;
	this.y = y - 8;
	this.frameCounter = 0;
	this.frameLasting = 3;
	this.lastingCounter = 0;
	this.frames = new Array();
	this.frames.push(document.getElementById("explosion1"));
	this.frames.push(document.getElementById("explosion2"));
}

TinyExplosion.prototype.render = function () {
	if (this.lastingCounter > this.frameLasting) {
		this.lastingCounter = 0;
		++this.frameCounter;
	} else {
		++this.lastingCounter;
	}

	if (this.frameCounter == this.frames.length) {
		this.die();
		return false;
	}

	this.x -= game.gamePlay.speed;
	game.context.drawImage(this.frames[this.frameCounter], this.x, this.y);
	return true;

};

TinyExplosion.prototype.die = function () {
};

function Fire() {
	this.projectiles = new Array();
}

Fire.prototype.render = function () {
	var survivors = new Array();

	for (let index in this.projectiles) {
		var projectile = this.projectiles[index];

		if (projectile.render()) {
			survivors.push(projectile);
		}
	}

	this.projectiles = survivors;
};

Fire.prototype.reset = function () {
	if (this.projectiles) {
		delete this.projectiles;
	}

	this.projectiles = new Array();
};

function EnemyFire() {
	this.projectiles = new Array();
}

EnemyFire.prototype.render = function () {
	var survivors = new Array();

	for (let index in this.projectiles) {
		var projectile = this.projectiles[index];

		if (projectile.render()) {
			survivors.push(projectile);
		}
	}

	this.projectiles = survivors;
};

EnemyFire.prototype.checkCollision = function (x, y, width, height) {
	for (let index in this.projectiles) {
		var projectile = this.projectiles[index];

		if (!projectile.dead) {
			if (game.gamePlay.isCollision(x, y, width, height, projectile.x, projectile.y, projectile.image.width, projectile.image.height)) {
				projectile.die();

				if (typeof(projectile.isBossShot) != "undefined" && projectile.isBossShot) {
					return 2;
				}

				return 1;

			}
		}
	}

	return 0;
};

EnemyFire.prototype.reset = function () {
	if (this.projectiles) {
		delete this.projectiles;
	}

	this.projectiles = new Array();
};

function Rain() {
	this.elements = new Array();
}

Rain.prototype.add = function (object) {
	this.elements.push(object);
};

Rain.prototype.render = function () {
	var survivors = new Array();

	for (let index in this.elements) {
		var element = this.elements[index];

		if (element.render()) {
			survivors.push(element);
		}
	}

	this.elements = survivors;
};

Rain.prototype.reset = function () {
	if (this.elements) {
		delete this.elements;
	}

	this.elements = new Array();
};

function Floor(level) {
	this.level = level;
	this.age = 0;
	this.data = new Array();
	this.column = 0;

	if (this.level == 0) { // level 0
		this.data.push("14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  "); // full height (23 tiles)
		this.data.push("10");
		this.data.push("10");
		this.data.push("10,32,30,30,30,33");
		this.data.push("10,30,30,30");
		this.data.push("10,30,30,30,30,33");
		this.data.push("10,30,30,30");
		this.data.push("10,30,30,30,30,33");
		this.data.push("10");
		this.data.push("11");
		this.data.push("11,20");
		this.data.push("11,21");
		this.data.push("11,22");
		this.data.push("11");
		this.data.push("10");
		this.data.push("10,30,33");
		this.data.push("10,30,33");
		this.data.push("10,32,30,33");
		this.data.push("10,30,33");
		this.data.push("10");
		this.data.push("00");
		this.data.push("00");
		this.data.push("10");
		this.data.push("12,14");
		this.data.push("12,10,32,30,30,31,30,33");
		this.data.push("12,15");
		this.data.push("11");
		this.data.push("11");
		this.data.push("11,20");
		this.data.push("11,21");
		this.data.push("11,22");
		this.data.push("11");
		this.data.push("11,32,33");
		this.data.push("11");
		this.data.push("11,32,33");
		this.data.push("11,30,33");
		this.data.push("11,20");
		this.data.push("11,32,33");
		this.data.push("11,21");
		this.data.push("11,32,33");
		this.data.push("11,30,33");
		this.data.push("11,22");
		this.data.push("11");
		this.data.push("11,20");
		this.data.push("11,21");
		this.data.push("11,22");
		this.data.push("11");
		this.data.push("11,32,33");
		this.data.push("11");
		this.data.push("11,32,33");
		this.data.push("11,30,33");
		this.data.push("11,20");
		this.data.push("11,32,33");
		this.data.push("11,21");
		this.data.push("11,32,33");
		this.data.push("11,30,33");
		this.data.push("11,22");
		this.data.push("11");
		this.data.push("11,20,20");
		this.data.push("11");
		this.data.push("11,32,33");
		this.data.push("11");
		this.data.push("11,32,33");
		this.data.push("11,30,33");
		this.data.push("11,20");
		this.data.push("11,32,33");
		this.data.push("11,21");
		this.data.push("11,32,33");
		this.data.push("11,30,33");
		this.data.push("11,22");
		this.data.push("11");
		this.data.push("10");
		this.data.push("12,14");
		this.data.push("12,10");
		this.data.push("12,12,14");
		this.data.push("12,12,12,14");
		this.data.push("12,12,12,10");
		this.data.push("03,02,01,00");
		this.data.push("12,12,12,10");
		this.data.push("12,12,12,15");
		this.data.push("12,12,15");
		this.data.push("12,10");
		this.data.push("12,15");
		this.data.push("10");
		this.data.push("10");
		this.data.push("12,14");
		this.data.push("12,10");
		this.data.push("12,10");
		this.data.push("12,10");
		this.data.push("12,12,14");
		this.data.push("12,12,10");
		this.data.push("12,12,12,14");
		this.data.push("12,13,12,10");
		this.data.push("12,12,12,10,38");
		this.data.push("12,12,12,10,38");
		this.data.push("12,12,12,10,38,38");
		this.data.push("12,12,12,10,38,38");
		this.data.push("12,12,12,10,38,38,38");
		this.data.push("12,12,12,10,38,38,38");
		this.data.push("12,12,12,10,38,38,38,14");
		this.data.push("12,12,12,10,38,38,38,10");
		this.data.push("12,12,12,10,38,38,38,12,14");
		this.data.push("12,12,12,10,38,38,38,12,10");
		this.data.push("12,12,12,10,38,38,38,12,13,14");
		this.data.push("12,12,12,10,38,38,38,12,12,10");
		this.data.push("12,12,12,10,38,38,38,12,12,12,14");
		this.data.push("12,12,12,10,38,38,38,12,12,12,10");
		this.data.push("12,12,12,10,38,38,38,12,12,12,12,14");
		this.data.push("12,12,12,10,38,38,38,12,12,12,12,10");
		this.data.push("12,12,12,10,38,38,38,12,12,12,13,12,14");
		this.data.push("12,12,12,10,38,38,38,12,12,12,12,12,10");
		this.data.push("12,12,12,10,38,38,38,12,12,12,12,12,12,14");
		this.data.push("12,12,12,10,38,38,38,12,12,12,12,12,12,10");
		this.data.push("12,12,12,10,38,38,38,12,12,12,12,12,12,15");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("01,01,01,00");
		this.data.push("12,12,12,12,14");
		this.data.push("12,12,12,12,10,38");
		this.data.push("12,12,12,12,10,38,38");
		this.data.push("12,13,12,12,10,38");
		this.data.push("12,12,12,12,10,38,38,38");
		this.data.push("12,12,12,12,10,38,38");
		this.data.push("12,12,12,12,10,38");
		this.data.push("12,12,12,12,10,38");
		this.data.push("12,12,12,12,15");
		this.data.push("12,12,12,10");
		this.data.push("12,12,12,10");
		this.data.push("12,12,12,10");
		this.data.push("12,12,12,15");
		this.data.push("12,12,10");
		this.data.push("12,12,10");
		this.data.push("12,12,12,14");
		this.data.push("12,12,12,10");
		this.data.push("12,12,12,10");
		this.data.push("12,12,12,10");
		this.data.push("12,12,12,10");
		this.data.push("12,13,12,10");
		this.data.push("12,12,12,10");
		this.data.push("12,12,12,15");
		this.data.push("12,12,10");
		this.data.push("12,12,15");
		this.data.push("12,10");
		this.data.push("12,10");
		this.data.push("12,10");
		this.data.push("12,15");
		this.data.push("10");
		this.data.push("11,20");
		this.data.push("11,30,33");
		this.data.push("11,32,30,33");
		this.data.push("11,30,33");
		this.data.push("11,21");
		this.data.push("11,22");
		this.data.push("11,30,33");
		this.data.push("11,32,30,33");
		this.data.push("11,30,33");
		this.data.push("11,20");
		this.data.push("11,21");
		this.data.push("11,30,33");
		this.data.push("11,32,30,33");
		this.data.push("11,30,33");
		this.data.push("11,22");
		this.data.push("11,20");
		this.data.push("11,30,33");
		this.data.push("11,32,30,30,33");
		this.data.push("11,30,31,33");
		this.data.push("11,32,30,30,33");
		this.data.push("11,30,33");
		this.data.push("11,21");
		this.data.push("11,22");
		this.data.push("11,30,33");
		this.data.push("11,32,30,33");
		this.data.push("11,30,33");
		this.data.push("11,20");
		this.data.push("11,21");
		this.data.push("11,30,33");
		this.data.push("11,32,30,33");
		this.data.push("11,30,33");
		this.data.push("11,22");
		this.data.push("11,20");
		this.data.push("11,30,33");
		this.data.push("11,32,30,33");
		this.data.push("11,30,33");
		this.data.push("11,21");
		this.data.push("10");
		this.data.push("12,14");
		this.data.push("12,10,32,30,31,30,33");
		this.data.push("12,15");
		this.data.push("10");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("10");
		this.data.push("10,32,30,30,30,33");
		this.data.push("10,30,30,30");
		this.data.push("10,30,30,30,30,33");
		this.data.push("10,30,30,30");
		this.data.push("10,30,30,30,30,33");
		this.data.push("10");
		this.data.push("12,14");
		this.data.push("12,12,14");
		this.data.push("12,12,12,14");
		this.data.push("12,12,12,12,14");
		this.data.push("12,12,12,12,12,14");
		this.data.push("12,12,12,12,12,10");
		this.data.push("12,12,12,12,12,10");
		this.data.push("12,12,12,12,12,12,14");
		this.data.push("12,12,12,12,12,12,12,14");
		this.data.push("12,12,12,12,12,12,12,12,14");
		this.data.push("12,12,12,12,12,12,12,12,12,14");
		this.data.push("12,12,12,12,12,12,12,12,12,10,  ,  ,  ,  ,  ,30,30,30,38,38,30,30,30");
		this.data.push("13,12,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30,30,38,38,30,30,30");
		this.data.push("12,12,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,12,12,13,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,13,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,12,13,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,13,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,13,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,12,12,12,12,13,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,13,12,12,12,12,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("03,02,02,02,02,02,02,01,01,00,  ,  ,  ,  ,  ,38,38");
		this.data.push("03,02,02,02,02,02,02,02,01,00,  ,  ,  ,  ,  ,38,38");
		this.data.push("03,02,02,02,02,02,02,01,01,00,  ,  ,  ,  ,  ,38,38");
		this.data.push("03,02,02,02,02,02,02,02,01,00,  ,  ,  ,  ,  ,38,38");
		this.data.push("03,02,02,02,02,02,02,01,01,00,  ,  ,  ,  ,  ,38,38");
		this.data.push("03,02,02,02,02,02,02,02,01,00,  ,  ,  ,  ,  ,38,38");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("13,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,13,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,13,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,00,  ,  ,  ,  ,  ,30,30,30,38,38,30,30,30");
		this.data.push("12,13,12,38,38,38,12,12,12,10,  ,  ,  ,  ,  ,30,30,30,38,38,30,30,30");
		this.data.push("12,12,12,38,38,38,12,12,12,15");
		this.data.push("12,12,12,38,38,38,12,12,15");
		this.data.push("12,12,12,38,38,38,12,15");
		this.data.push("12,12,12,38,38,38,15");
		this.data.push("12,12,12,38,38,38");
		this.data.push("12,12,12,38,38,38");
		this.data.push("12,12,12,38,38,38");
		this.data.push("12,12,12,38,38");
		this.data.push("12,12,12,38");
		this.data.push("12,12,15");
		this.data.push("12,15");
		this.data.push("10");
		this.data.push("11,20");
		this.data.push("11,21,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40"); // screen width begin
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,32,30,33,  ,  ,  ,  ,  ,  ,  ,40,41,50,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,22,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,20,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,21,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,22,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,32,30,33,  ,  ,  ,  ,  ,  ,  ,40,41,50,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,20,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,21,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,32,30,30,33,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,31,33,  ,  ,  ,  ,  ,  ,  ,40,41,50,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,32,30,30,33,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,22,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,20,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,21,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,22,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,20,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,21,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,40,41,50,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,32,30,33,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,22,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,20,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,32,30,33,  ,  ,  ,  ,  ,  ,  ,40,41,50,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,21,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,22,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,20,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,21,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,32,30,33,  ,  ,  ,  ,  ,  ,  ,40,41,50,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,30,33,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40");
		this.data.push("11,22,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40"); // screen width end
		this.data.push("15");
	} else if (this.level == 1) { // level 1
		this.data.push("74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  "); // full height (23 tiles)
		this.data.push("72,74");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,30,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,11,32,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("72,74");
		this.data.push("72,72,74");
		this.data.push("72,72,70,26");
		this.data.push("72,72,70");
		this.data.push("72,72,70");
		this.data.push("72,72,70,27");
		this.data.push("72,72,75");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("72,74");
		this.data.push("72,70");
		this.data.push("72,72,74");
		this.data.push("72,72,70");
		this.data.push("72,72,70");
		this.data.push("72,72,70,27");
		this.data.push("72,72,70,26");
		this.data.push("72,72,75");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,16,12,11,30,30,30,33");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,17,12,11,32,30,30,33");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("72,72,74");
		this.data.push("72,72,70");
		this.data.push("72,72,70,27");
		this.data.push("72,72,70,26");
		this.data.push("72,72,75");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("70,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("70,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("70,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("72,74");
		this.data.push("72,70");
		this.data.push("72,70,27");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70,26");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,11,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,11,32,33");
		this.data.push("72,74");
		this.data.push("72,70");
		this.data.push("72,70,26");
		this.data.push("72,72,74");
		this.data.push("72,72,70");
		this.data.push("72,72,75");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,11,32,33");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,11,30,33");
		this.data.push("72,72,74");
		this.data.push("72,72,70");
		this.data.push("72,72,70");
		this.data.push("72,72,70");
		this.data.push("72,72,70");
		this.data.push("72,72,75");
		this.data.push("72,70,  ,  ,  ,  ,  ,16,11,32,33");
		this.data.push("72,70,  ,  ,  ,  ,  ,17,11,30,33");
		this.data.push("72,72,74");
		this.data.push("72,72,70");
		this.data.push("72,72,70,27");
		this.data.push("72,72,75");
		this.data.push("72,70");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,11,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,11,32,33");
		this.data.push("72,74");
		this.data.push("72,70,27");
		this.data.push("72,72,74");
		this.data.push("72,72,75");
		this.data.push("72,70");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("72,74");
		this.data.push("72,70");
		this.data.push("72,72,74");
		this.data.push("72,72,75");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,16,11,30,33");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,17,11,32,33");
		this.data.push("72,72,74");
		this.data.push("72,72,75");
		this.data.push("72,70,26");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("72,74");
		this.data.push("72,70,26");
		this.data.push("72,70,27");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,11,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,11,32,33");
		this.data.push("72,74");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("72,74");
		this.data.push("72,70");
		this.data.push("72,70,27");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,16,11,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,17,11,32,33");
		this.data.push("72,74");
		this.data.push("72,70,26");
		this.data.push("72,70");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("70,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("70,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("70,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("72,74");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,75");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,11,30,33");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,11,32,33");
		this.data.push("72,74");
		this.data.push("72,70,26");
		this.data.push("72,70");
		this.data.push("72,72,74");
		this.data.push("72,72,72,74");
		this.data.push("72,72,72,75");
		this.data.push("72,72,75");
		this.data.push("72,70");
		this.data.push("72,70,27");
		this.data.push("72,70,26");
		this.data.push("72,70");
		this.data.push("72,72,74");
		this.data.push("72,72,75");
		this.data.push("72,72,74");
		this.data.push("72,72,72,74");
		this.data.push("72,72,72,72,74");
		this.data.push("72,72,72,72,75");
		this.data.push("72,72,72,75");
		this.data.push("72,72,75");
		this.data.push("72,70");
		this.data.push("72,70,26");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,16,12,10");
		this.data.push("08,07,  ,  ,17,12,10");
		this.data.push("08,07,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,16,10");
		this.data.push("08,07,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,16,10");
		this.data.push("08,07,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,16,10");
		this.data.push("08,07,  ,  ,17,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,16,12,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,17,12,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,17,10,  ,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07,  ,  ,16,10");
		this.data.push("08,07,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,16,10");
		this.data.push("08,07,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10");
		this.data.push("08,07,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10");
		this.data.push("08,07,  ,  ,16,10");
		this.data.push("08,07,  ,16,12,10");
		this.data.push("08,07,  ,17,12,10");
		this.data.push("08,07,  ,  ,17,10");
		this.data.push("08,07");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70,26");
		this.data.push("72,70");
		this.data.push("72,70,44");
		this.data.push("72,70,40,44");
		this.data.push("72,70,40,45");
		this.data.push("72,70,45");
		this.data.push("72,70,41,50");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,72,74");
		this.data.push("72,72,75");
		this.data.push("72,72,74");
		this.data.push("72,72,72,74");
		this.data.push("72,72,72,72,74");
		this.data.push("72,72,72,72,75");
		this.data.push("72,72,72,75");
		this.data.push("72,72,75");
		this.data.push("72,70");
		this.data.push("72,70,27");
		this.data.push("72,70");
		this.data.push("72,70,27");
		this.data.push("72,70");
		this.data.push("72,70,26");
		this.data.push("72,70,27");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70,26");
		this.data.push("72,70,26");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,72,74");
		this.data.push("72,72,70,41,50");
		this.data.push("72,72,75");
		this.data.push("72,70");
		this.data.push("72,70,27");
		this.data.push("72,70");
		this.data.push("72,70,26");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70,27");
		this.data.push("72,70");
		this.data.push("72,70");
		this.data.push("72,70,27");
		this.data.push("72,70");
		this.data.push("72,70,26");
		this.data.push("72,70");
		this.data.push("72,70,44");
		this.data.push("72,70,40,44");
		this.data.push("72,70,40,40,44");
		this.data.push("72,70,40,40,40,44");
		this.data.push("72,70,40,40,40,40,44");
		this.data.push("72,70,40,40,40,40,40,44");
		this.data.push("72,70,40,40,40,40,40,40,44");
		this.data.push("72,70,40,40,40,40,40,40,40,44");
		this.data.push("72,70,40,40,40,40,40,40,40,40,44");
		this.data.push("72,70,40,40,40,40,40,40,40,40,45");
		this.data.push("72,70,40,40,40,40,40,40,40,45");
		this.data.push("72,70,40,40,40,40,40,40,45");
		this.data.push("72,70,40,40,40,40,40,45");
		this.data.push("72,70,40,40,40,40,45");
		this.data.push("72,70,40,40,40,45");
		this.data.push("72,70,40,40,40,44");
		this.data.push("72,70,40,40,40,40,44");
		this.data.push("72,70,40,40,40,40,45");
		this.data.push("72,70,40,40,40,45");
		this.data.push("72,70,40,40,45");
		this.data.push("72,70,40,45");
		this.data.push("72,70,45");
		this.data.push("72,70,26");
		this.data.push("72,72,74");
		this.data.push("72,72,70,41,50");
		this.data.push("72,72,75");
	} else if (this.level == 2) { // level 2
		this.data.push("80,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  "); // full height (23 tiles)
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,68");
		this.data.push("84,68,68");
		this.data.push("84");
		this.data.push("84,68");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,68,68,88,80");
		this.data.push("84,68,68,68,84");
		this.data.push("84,68,68,68,84,68");
		this.data.push("84,68,68,68,84");
		this.data.push("84,68,68,68,84");
		this.data.push("84,68,68,68,84,68");
		this.data.push("84,68,68,68,84");
		this.data.push("84,68,68,68,84,68");
		this.data.push("84,68,68,68,84,68,68");
		this.data.push("84,68,68,68,84,68");
		this.data.push("84,68,68,68,84,68");
		this.data.push("84,68,68,88,81");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,82");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,68,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,68,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,68,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,68,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,68,68,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,83,85,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,83");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("84");
		this.data.push("84");
		this.data.push("83,80");
		this.data.push("85,81");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("85,80");
		this.data.push("82,81");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,  ,82,85,86,  ,  ,88,85,85");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,84,68,68,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,84,68,68,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,84,68,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,68,  ,  ,  ,  ,  ,84,68,  ,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,68,68,  ,  ,  ,  ,84,68,68,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,68,68,  ,  ,  ,  ,84,68,68,  ,  ,  ,  ,  ,84,  ,  ,  ,  ,  ,  ,84");
		this.data.push("84,85,86,  ,  ,88,85,85,85,85,85,85,85,85,85,81,  ,  ,  ,  ,  ,  ,83");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("83,80");
		this.data.push("85,81");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("85,80");
		this.data.push("82,81");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,82");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,  ,84");
		this.data.push("84,68,68,68,68,68,  ,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,  ,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,  ,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,  ,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,  ,84,68,68,68,68,68,  ,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,  ,84,68,68,68,68,68,68,84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,87,  ,  ,  ,  ,  ,  ,  ,87,  ,  ,  ,  ,  ,  ,83");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("83,80");
		this.data.push("85,81");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,61");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("06");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("85,80");
		this.data.push("82,81");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,82");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,  ,84");
		this.data.push("84,68,68,68,68,68,  ,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,  ,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,  ,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,  ,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,  ,84,68,68,68,68,68,  ,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,  ,84,68,68,68,68,68,68,84");
		this.data.push("84,85,85,85,85,85,85,81,  ,  ,  ,  ,  ,  ,  ,83,85,86,  ,  ,88,85,85");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("83,80");
		this.data.push("85,81");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("85,80");
		this.data.push("82,81");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,82");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,  ,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,  ,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,  ,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,85,86,  ,  ,88,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("83,80");
		this.data.push("85,81");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("85,80");
		this.data.push("82,81");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,  ,89,  ,  ,  ,  ,  ,  ,82");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,  ,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,68,68,68,68,68,68,84,68,68,68,68,68,68,68,84,68,68,68,68,68,68,84");
		this.data.push("84,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,86,  ,  ,88,85,85");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("83,80");
		this.data.push("85,81");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("85,80");
		this.data.push("82,81");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,41,50");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("84,61");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,61");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84");
		this.data.push("84,41,50");
		this.data.push("81");
	} else if (this.level == 3) { // level 3
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  "); // full height (23 tiles)
		this.data.push("95,95");
		this.data.push("94,94");
		this.data.push("96,94");
		this.data.push("96,94");
		this.data.push("96,94");
		this.data.push("94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("95,95,95,95,95,95,95,  ,  ,95,95,95,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("94,94,94,94,94,94,94,  ,  ,94,94,94,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("94,93,93,93,94,93,94,  ,  ,94,93,94,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,90,91,90,91,90,91,90,91,90,91,90,91,90,91,90,91,90,91,90,91,90,94");
		this.data.push("94,91,90,91,90,91,90,91,90,91,90,91,90,91,90,91,90,91,90,91,90,91,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,90,91,94,94,94,94,94,94,94,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,91,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,90,91,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,91,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,97,96,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,97,96,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,97,96,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,91,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,90,91,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,91,90,94,  ,  ,  ,95,95,95");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,90,91,94,94,94,94,94,94,94,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,91,90,91,90,91,90,91,90,91,90,91,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,90,91,90,91,90,91,90,91,90,91,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ,95,95,95,95");
		this.data.push("  ,94,94,94,94");
		this.data.push("  ,94,97,96,94");
		this.data.push("  ,94,97,96,94");
		this.data.push("  ,94,97,96,94,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,95,95,95");
		this.data.push("  ,94,94,94,94,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,94,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,93,94,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,94,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,98,98,98,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,99,99,99,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,94,94,94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,95,95");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,94,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,94,91,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,94,97,96,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,94,97,96,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,94,94,94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ,  ,  ,  ,  ,95,95,95,95,95,95,95,95");
		this.data.push("  ,  ,  ,  ,  ,94,94,94,94,94,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,94,98,98,98,98,98,98,94");
		this.data.push("  ,  ,  ,  ,  ,94,99,99,99,99,99,99,94");
		this.data.push("  ,  ,  ,  ,  ,94,94,93,94,93,94,93,94");
		this.data.push("  ,  ,  ,  ,  ,94,94,94,94,94,94,94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ,  ,  ,  ,  ,  ,95,95,95");
		this.data.push("  ,  ,  ,  ,  ,  ,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,94,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,94,97,96,94");
		this.data.push("  ,  ,  ,  ,  ,94,97,96,94");
		this.data.push("  ,  ,  ,  ,  ,94,94,94,94");
		this.data.push("  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,95,95,95,95,95,95,95,95");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,97,96,94,97,96,94,97,96");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,97,96,94,97,96,94,97,96");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,98,98,98,98");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,99,99,99,99");
		this.data.push("  ,  ,  ,  ,  ,  ,95,95,95,95,95");
		this.data.push("  ,  ,  ,  ,  ,  ,94,98,98,98,94");
		this.data.push("  ,  ,  ,  ,  ,  ,94,99,99,99,94");
		this.data.push("  ,  ,  ,  ,  ,  ,94,94,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,94,94,  ,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,94,  ,  ,  ,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("95,95");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("95,94");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("94");
		this.data.push("95,95");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("95,94");
		this.data.push("96");
		this.data.push("96");
		this.data.push("94");
		this.data.push("95,95");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("95,94");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("95,95");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("95");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("94");
		this.data.push("  ");
		this.data.push("95,95,95");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,94,94");
		this.data.push("95,95,94");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("95,95,95");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,94,94");
		this.data.push("95,94,94");
		this.data.push("96");
		this.data.push("96");
		this.data.push("94");
		this.data.push("95,95");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("95,94");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("94");
		this.data.push("  ");
		this.data.push("95,95");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("95");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("94");
		this.data.push("  ");
		this.data.push("95,95,95");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,94,94");
		this.data.push("95,95,94");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("95,95,95");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,97,96");
		this.data.push("94,94,94");
		this.data.push("95,94,94");
		this.data.push("96");
		this.data.push("96");
		this.data.push("94");
		this.data.push("95,95");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("95,94");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("96");
		this.data.push("94");
		this.data.push("95,95");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("97,96");
		this.data.push("94,94");
		this.data.push("95,94");
		this.data.push("  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,95,95,95,95,95,95,95,95");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,97,96,94,97,96,94,94,98,98,98,98,98,94,94,98,98,98,98,98,98,94,94");
		this.data.push("94,97,96,94,97,96,94,94,99,99,99,99,99,94,94,99,99,99,99,99,99,94,94");
		this.data.push("94,97,96,94,97,96,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,97,96,94,97,96,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,91,94,94,91,91,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,91,91,94,91,91,91,91,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,90,91,94,90,91,90,90,91,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,90,91,94,90,91,94,90,91,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,90,91,94,90,91,94,91,91,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,90,91,91,91,91,90,91,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,90,90,91,91,94,90,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,90,90,94,94,94,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,95,95,95");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,  ,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,98,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,99,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ,  ,  ,95,95,95,95,95,95,95,95,95,95");
		this.data.push("  ,  ,  ,94,94,94,94,94,94,94,94,94,94");
		this.data.push("  ,  ,  ,94,97,96,94,97,96,94,97,96,94");
		this.data.push("  ,  ,  ,94,97,96,94,97,96,94,97,96,94");
		this.data.push("  ,  ,  ,94,97,96,94,97,96,94,97,96,94");
		this.data.push("  ,  ,  ,94,97,96,94,97,96,94,97,96,94");
		this.data.push("  ,  ,  ,94,97,96,94,97,96,94,97,96,94");
		this.data.push("  ,  ,  ,94,94,94,94,94,94,94,94,94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,95,95");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,94,98,98,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,94,99,99,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,94,91,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,98,98,98,98");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,99,99,99,99");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,95,95,95,95,95,95,95,95");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,94,97,96,94,97,96,98,98");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,94,97,96,94,97,96,99,99");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,94,97,96,94,97,96,94,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,94,93,94,94,93,94,94,91");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,94,94,94,94,94,94,94,94");
		this.data.push("  ");
		this.data.push("  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,95,95,95,95");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("91,90,91,90,91,90,91,90,91,90,91,90,91,94");
		this.data.push("90,91,90,91,90,91,90,91,90,91,90,91,90,94");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,90,91,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,91,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,90,91,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,91,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,90,91,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,91,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,90,91,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,91,90,94");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,94,90,91,94,  ,  ,  ,  ,  ,  ,  ,94,94");
		this.data.push("  ,  ,95,95,  ,  ,  ,  ,  ,  ,94,91,90,94,  ,  ,  ,  ,  ,  ,  ,94,93");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,97,96,94,94,94,94,94,94,94,94,94,94");
		this.data.push("94,91,90,91,90,91,90,91,90,91,90,97,96,91,90,91,90,91,90,91,90,91,90");
		this.data.push("94,90,91,90,91,90,91,90,91,90,91,97,96,90,91,90,91,90,91,90,91,90,91");
		this.data.push("94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94");
		this.data.push("  ");
	} else if (this.level == 4) { // level 4
		this.data.push("14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16"); // full height (23 tiles)
		this.data.push("12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("13,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,16,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("13,11,09,  ,  ,  ,  ,  ,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("13,11,18,  ,  ,  ,  ,  ,  ,  ,  ,12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,15,  ,  ,  ,  ,16,14,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,11,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,16,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,11,18,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,  ,  ,  ,12");
		this.data.push("13,11,09,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,17,12,11,09,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,12,11,18,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,16,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,11,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,15,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,10,  ,  ,  ,12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,17,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("13,11,09,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,11,  ,  ,  ,  ,  ,16,12,14,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,11,  ,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,11,18,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,11,  ,  ,  ,  ,  ,12,12,11,09,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,11,  ,  ,  ,  ,16,12,12,11,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,14,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,10,09,  ,  ,  ,12,12,11,  ,  ,  ,12,12,12,12,14,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,11,  ,  ,  ,12,12,12,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,11,09,  ,  ,12,12,12,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,11,09,  ,  ,12,12,12,12,11,18,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,17,12,15,  ,  ,  ,12,12,12,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,13,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,16,12,14,  ,  ,  ,  ,  ,12,12,12,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,12,12,12,14,  ,  ,  ,  ,17,12,12,12,15,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,12,12,12,12,14,  ,  ,  ,  ,17,12,15,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,12,12,12,12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,12,12,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,12,12,12,12,12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,12,12,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,17,12,12,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,16,14,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,12,11,18,  ,  ,  ,  ,  ,  ,12,11,09,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,12,11,09,  ,  ,  ,  ,  ,  ,17,15,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,17,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,12,12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,08,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,08,30,30,50,30,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,17,12,12,11,  ,  ,  ,08,30,08,30,30,30,08,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,08,30,30,50,30,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,12,12,12,14,  ,  ,  ,  ,08,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,17,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,12,12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,17,12,12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,12,12,12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,17,12,12,12,12,12,14,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,17,12,12,12,12,11,09,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,12,15,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,16,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,16,11,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,17,11,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,17,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,14,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,11,18,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,11,18,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,14,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,15,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,15,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12");
		this.data.push("12,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12");
		this.data.push("12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,16,12,14,  ,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,12,12,11,18,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,16,12,12,11,  ,  ,  ,  ,  ,  ,  ,17,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,18,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,16,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,12,12,12,12,12,14,  ,  ,  ,  ,  ,  ,  ,17,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,12,12,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,12,12,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,12,12,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,12,12,12,12,12,10,09,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,12,12,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,12,12,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,17,12,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,12,12,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,16,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,12,12,12,10,18,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,17,12,12,10,18,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,17,12");
		this.data.push("12,12,14,  ,  ,  ,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,11,  ,  ,  ,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,11,18,  ,  ,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,11,  ,  ,  ,  ,  ,  ,  ,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,11,09,  ,  ,  ,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,11,18,  ,  ,  ,  ,  ,  ,12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,11,09,  ,  ,  ,  ,  ,  ,17,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12");
		this.data.push("12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12");
		this.data.push("12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,16,14,  ,  ,  ,  ,08,40,40,08,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,16,12,11,  ,  ,  ,08,40,40,50,40,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,12,12,11,  ,  ,08,40,08,40,40,40,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,17,12,11,  ,  ,  ,08,40,40,50,40,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,17,15,  ,  ,  ,  ,08,40,40,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,16,14,  ,  ,  ,08,08,30,30,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,16,12,11,  ,  ,08,30,30,08,30,  ,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,16,11,12,11,  ,  ,08,30,08,30,30,50,  ,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,12,11,12,11,  ,  ,08,30,30,08,30,30,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,17,11,12,11,  ,  ,08,30,08,30,30,50,  ,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,17,12,11,  ,  ,08,30,30,08,30,  ,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,17,15,  ,  ,  ,08,08,30,30,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12");
		this.data.push("12,12,14,  ,  ,  ,08,08,40,40,40,40,08,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,12,11,  ,  ,08,40,40,08,40,40,  ,40,08,  ,  ,  ,  ,  ,  ,16,12,12");
		this.data.push("12,12,11,  ,  ,08,40,08,40,40,50,  ,40,08,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,12,11,  ,  ,08,40,40,08,40,40,40,40,08,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,12,11,  ,  ,08,40,08,40,40,50,  ,40,08,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,12,11,  ,  ,08,40,40,08,40,40,  ,40,08,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,12,15,  ,  ,  ,08,08,40,40,40,40,08,  ,  ,  ,  ,  ,  ,  ,17,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,16,14,  ,  ,  ,08,08,30,30,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,16,12,11,  ,  ,08,30,30,08,30,  ,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,16,11,12,11,  ,  ,08,30,08,30,30,50,  ,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,12,11,12,11,  ,  ,08,30,30,08,30,30,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,17,11,12,11,  ,  ,08,30,08,30,30,50,  ,30,08,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,17,12,11,  ,  ,08,30,30,08,30,  ,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,17,15,  ,  ,  ,08,08,30,30,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,12,14,  ,  ,  ,08,08,40,40,40,40,08,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,12,11,  ,  ,08,40,40,08,40,40,  ,40,08,  ,  ,  ,  ,  ,  ,16,12,12");
		this.data.push("12,12,11,  ,  ,08,40,08,40,40,50,  ,40,08,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,12,11,  ,  ,08,40,40,08,40,40,40,40,08,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,12,11,  ,  ,08,40,08,40,40,50,  ,40,08,  ,  ,  ,  ,  ,  ,17,12,12");
		this.data.push("12,12,11,  ,  ,08,40,40,08,40,40,  ,40,08,  ,  ,  ,  ,  ,  ,  ,17,12");
		this.data.push("12,12,15,  ,  ,  ,08,08,40,40,40,40,08,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,08,08,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,16,14,  ,  ,  ,  ,08,30,30,08,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,16,12,11,  ,  ,  ,08,30,30,50,30,08,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,12,12,11,  ,  ,08,30,08,30,30,30,08,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,17,12,11,  ,  ,  ,08,30,30,50,30,08,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,17,15,  ,  ,  ,  ,08,30,30,08,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,  ,  ,  ,  ,  ,  ,  ,  ,16,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,15,17,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,15,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,11,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,16,12,14,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,18,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,12,12,15,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,11,09,  ,  ,  ,  ,  ,  ,  ,12,11,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,17,12,12,14,  ,  ,  ,  ,  ,  ,16,12,11,09,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,12,12,11,09,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,11,18,  ,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,17,12,15,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,16,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,16,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,16,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,16,12,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,12,12,12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,12,11,17,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,12,15,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,15,  ,  ,12,12,14,  ,  ,  ,  ,  ,16,14,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,12,12,11,  ,  ,  ,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,11,09,  ,  ,  ,  ,12,11,18,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,16,12,12,11,  ,  ,  ,  ,16,12,12,14,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,12,12,12,15,  ,  ,  ,  ,12,12,12,11,18,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,12,12,11,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,12,12,15,  ,  ,  ,  ,  ,12,12,12,11,09,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,17,15,  ,  ,  ,  ,  ,16,12,12,12,15,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,09,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,17,12,12,12,14,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,18,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,12,12,14,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,14,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,12,12,11,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,11,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,14,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,11,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12,12,12,11,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12,12,12,12,11,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12,12,12,30,12,15,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12,12,12,12,12,11,  ,  ,  ,  ,12");
		this.data.push("12,11,18,  ,  ,  ,  ,  ,  ,16,12,12,12,15,17,12,12,15,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,16,12,12,12,12,15,  ,  ,17,15,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,16,12,12,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,12,12,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,16,12,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,12,11,18,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,09,  ,  ,12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,17,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,08,08,  ,08,30,30,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,08,30,30,08,30,30,  ,  ,30,08,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,08,30,30,30,08,30,50,  ,30,30,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,08,30,30,08,30,30,30,30,30,30,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,08,30,08,30,08,30,  ,  ,30,30,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,08,30,30,08,30,30,50,  ,30,08,08,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,08,08,  ,08,30,30,30,30,08,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,08,08,  ,08,30,50,  ,30,08,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,08,30,30,08,30,30,  ,  ,30,08,08,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,08,30,08,30,08,30,30,30,30,30,08,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,08,30,30,08,30,30,50,  ,30,30,08,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,08,30,30,30,08,30,  ,  ,30,30,08,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,08,30,30,30,30,30,30,30,30,08,08,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,08,08,08,08,30,30,30,30,08,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,  ,08,30,30,30,30,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,08,30,30,50,  ,30,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,08,30,08,30,  ,  ,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,08,30,30,30,30,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,30,08,30,50,  ,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,08,30,30,  ,  ,30,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,  ,08,30,30,30,30,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,08,08,30,30,30,30,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,30,30,30,30,30,30,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,30,08,30,  ,  ,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,08,30,30,50,  ,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,08,30,08,30,30,30,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,08,30,30,  ,  ,30,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,  ,08,30,50,  ,30,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12");
		this.data.push("12,12,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("11,13,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12");
		this.data.push("11,12,12,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("11,12,11,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12,12");
		this.data.push("11,12,11,12,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12");
		this.data.push("11,12,11,12,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,13,12,12");
		this.data.push("11,12,11,13,12,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,12");
		this.data.push("11,12,11,12,11,12,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,12,12,12,12");
		this.data.push("11,12,11,12,11,12,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,12,12");
		this.data.push("11,12,11,12,11,12,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,12,12");
		this.data.push("11,13,11,12,11,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,13,12,12,12");
		this.data.push("11,12,11,12,12,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,12,12");
		this.data.push("11,12,11,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,12,12,12");
		this.data.push("11,12,12,12,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12,13");
		this.data.push("11,12,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,12,12");
		this.data.push("11,12,13,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12,12");
		this.data.push("11,12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,12");
		this.data.push("13,12,11,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,12");
		this.data.push("12,12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,  ,08,30,50,  ,30,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,08,30,30,  ,  ,30,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,08,30,08,30,30,30,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,08,30,30,50,  ,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,30,08,30,  ,  ,30,30,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,08,30,30,30,30,30,30,30,30,08,08,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,08,08,08,08,30,30,30,30,08,  ,  ,  ,  ,  ,12");
		this.data.push("12,11,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,08,08,08,08,  ,  ,  ,  ,  ,  ,12");
		this.data.push("12,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12");
		this.data.push("15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
	} else if (this.level == 5) { // level 5
		this.data.push("A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A3"); // full height (23 tiles)
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,A3,A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,A5,A2,  ,  ,A3,A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,A5");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A3");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,28,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("02,02,02,02,02,02,02,02,02,02,02,02,02,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,01,03,02,02,02,02,02,00,  ,  ,  ,  ,A3,A0,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,28,28,  ,  ,  ,  ,A4,A1,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,A4");
		this.data.push("02,02,02,02,02,02,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5,A2,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A3,A0,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,A5,A2,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("02,02,02,02,02,02,02,02,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02,02,02,02,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,28,28,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,28,01,03,02,02,02,02,02,02,02,02,02,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("02,02,02,02,02,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,28,28,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,A5");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,A3");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("A0,  ,  ,  ,  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A3");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,A5");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A3");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,28,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,01,03,02,02,02,02,02,00,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("02,02,02,02,02,02,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A3,A0,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4,A1,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4,A1,  ,  ,A5,A2,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A3,A0,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ");
		this.data.push("  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ");
		this.data.push("  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5,A2,  ,  ,  ");
		this.data.push("  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A3,A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A3,A0,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1,  ,  ");
		this.data.push("A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5,A2,  ,A3");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,A5");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,28,00,  ,  ,  ,A3");
		this.data.push("02,02,02,02,02,02,02,02,02,02,02,02,02,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("02,02,02,02,02,02,02,02,02,02,02,02,02,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,01,03,02,02,02,02,02,02,02,02,02,02,00,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("02,02,02,02,02,02,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A5");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A2,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A3");
		this.data.push("02,02,02,02,02,02,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,28,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,01,03,02,02,02,02,02,02,02,02,02,02,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,28,28,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("02,02,02,02,02,02,02,02,02,02,02,02,02,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02,00,  ,  ,  ,A4");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("02,02,02,02,02,02,02,02,02,02,02,02,02,00,  ,  ,  ,28,00,  ,  ,  ,A4");
		this.data.push("A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,28,00,  ,  ,  ,A5");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,01,03,02,02,02");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,28,28,  ,  ,  ,A3");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5");
	} else if (this.level == 6) { // level 6
		this.data.push("40,40,40,40,40,40,40,40,40,40,40,40,40,28,  ,  ,  ,  ,  ,  ,  ,  ,  "); // full height (23 tiles)
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,28,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,28,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,28,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,28,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,28,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,28,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,28,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,28,28,28");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,88,85");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,88");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,88,85");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,88");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("72,70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,88,85");
		this.data.push("72,72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("72,72,70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,88,85");
		this.data.push("72,72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,88");
		this.data.push("72,72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,88,85,85");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,88");
		this.data.push("72,70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,88,85");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,88");
		this.data.push("72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,88,85,85");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,88");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,88,85");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,88,85");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,88");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,88,85");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,  ");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("72,70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("72,70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,88,85");
		this.data.push("70,25,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("70,23,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,88,85");
		this.data.push("70,24,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,88,85,85");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,88,85");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,88");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,88,85");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,88");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,88");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,88");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,04,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,05,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,06,  ,  ,  ");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,00,  ,  ,  ");
		this.data.push("40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,28,  ,  ");
	} else if (this.level == 7) { // level 7
		this.data.push("74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  "); // full height (23 tiles)
		this.data.push("72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,75,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,41,50,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,46,46,46,46,46,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,75,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,41,50,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,70,09,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,41,50,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,41,50,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,72,72,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,75,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");

		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,41,50,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,75,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,46,46,46,46,46,40,40,40,40,40,40,40,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,75,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,41,50,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,46,46,46,46,46,40,40,46,46,46,46,46,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,74,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,46,46,46,46,46,40,40,46,46,46,46,46,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,41,50,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40");
		this.data.push("40,40,74,  ,  ,  ,  ,40,40,  ,  ,  ,  ,  ,40,40,74,  ,  ,  ,  ,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,40,40,40,40,40,40,40");
		this.data.push("40,40,40,40,40,40,40,40,40,38,38,38,38,38,40,40,40,40,40,40,40,40,40");
		this.data.push("75,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ");
	} else if (this.level == -1) { // secret level -1
		this.data.push("14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16"); // full height (23 tiles)
		this.data.push("72,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,14,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70");
		this.data.push("12,72,10");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70,19,19");
		this.data.push("12,72,10,19,  ,  ,  ,  ,  ,  ,16,72,14");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,16,72,12,72,14");
		this.data.push("12,72,10,19,  ,  ,  ,  ,  ,72,12,72,12,70,19,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,19,19,  ,  ,  ,  ,12,72,12,72,10,19,19,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,19,  ,  ,  ,  ,  ,72,12,72,12,70,19,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,19,  ,  ,  ,  ,  ,12,72,12,72,10,19,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("19,19,19,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("19,19,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("19,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("19,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,17,72,12,72,15");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,17,72,15");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,19,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70,19,19,19");
		this.data.push("12,72,10,19,19");
		this.data.push("72,12,70,19,19");
		this.data.push("12,72,10,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,16,72,14");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,16,72,12,72,14");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,19,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,19,19,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,19,19,19,  ,  ,  ,72,12,72");
		this.data.push("19,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,19,19,19,19,  ,  ,12,72,12");
		this.data.push("19,19,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,19,19,19,19,19,  ,72,12,72");
		this.data.push("19,19,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,19,19,19,19,19,  ,12,72,12");
		this.data.push("19,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,19,19,19,19,  ,  ,72,12,72");
		this.data.push("19,19,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,19,19,19,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,19,19,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,19,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,19,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,17,72,12,72,15");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,17,72,15");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70");
		this.data.push("12,72,10");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,16,72,14");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,16,72,12,72,14");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,17,72,12,72,15");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,17,72,15");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,19,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,19,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,19,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,19,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,19,19,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,19,19,19,19,19,19,19,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,19,19,19,19,19,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,19,19,19,19");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,19,19,19");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,19,19,19,19");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,19,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,19,19,19,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,17");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,16,72,14");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,16,72,12,72,14");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,19,72,12,72,12,70,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,19,19,12,72,12,72,10,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,19,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,17,72,12,72,15");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,17,72,15");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,16,72,14");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,16,72,12,72,14");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,19,12,72,12,72,10,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,19,19,72,12,72,12,70,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,19,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,19,12,72,12");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,19,12,72,12,72,10,  ,  ,  ,  ,19,19,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,19,19,72,12,72,12,70,  ,  ,  ,  ,  ,19,12,72,12");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,19,19,12,72,12,72,10,  ,  ,  ,  ,  ,19,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,19,19,19,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,19,19,19,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,19,19,72,12,72,12,70,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,19,12,72,12,72,10,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,17,72,12,72,15");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,17,72,15");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70");
		this.data.push("12,72,10");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
		this.data.push("72,12,70");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,16,72,14");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,16,72,12,72,14");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,  ,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,  ,  ,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,  ,  ,19,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,  ,  ,19,19,19,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,12,72,12,72,10,  ,  ,19,19,19,19,19,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,72,12,72,12,70,  ,19,19,19,19,19,19,19,17");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,17,72,12,72,15,19,19,19,19,19,19,19,19,19");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,19,19,17,72,15,19,19,19,19,19,19,19,19,19,19");
		this.data.push("72,12,70,  ,  ,  ,  ,19,19,19,19,19,19,19,19,19,19,19,  ,19,19,19,19");
		this.data.push("12,72,10,  ,  ,  ,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,16");
		this.data.push("72,12,70,  ,  ,19,19,19,19,19,  ,19,19,19,19,19,19,19,19,19,19,16,72");
		this.data.push("12,72,10,  ,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,16,72,12");
		this.data.push("72,12,70,19,19,19,19,19,19,19,19,19,19,19,19,  ,19,19,19,19,72,12,72");
		this.data.push("12,72,10,  ,19,19,19,  ,19,19,19,19,19,19,19,19,19,19,19,19,12,72,12");
		this.data.push("72,12,70,  ,  ,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,19,19,19,19,19,19,19,19,19,19,19,19,19,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,19,19,19,19,19,  ,19,19,19,19,19,19,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,19,19,19,19,19,19,19,19,19,  ,19,19,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,19,19,19,19,19,19,19,19,19,19,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,19,19,19,19,19,19,17,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,19,19,19,19,19,19,17,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,19,19,19,19,19,19,17");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,19,19,19,19,19,19");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,19,19,19,19,19");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,  ,19,19,19");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,19,19,16");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,19,19,16,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,19,16,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,19,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,10,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,12,72,12");
		this.data.push("72,12,70,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,72,12,72");
		this.data.push("12,72,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72,12");
		this.data.push("72,15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,72");
		this.data.push("15,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17");
	} else if (this.level == -2) { // secret level -2
		this.data.push("80,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,82"); // full height (23 tiles)
		this.data.push("72,80,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,82,72");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");

		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");

		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");

		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("FF,FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("FF,FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("FF,FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("FF,FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");

		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF,FF");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF,FF");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF,FF");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF,FF");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF,FF");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF,FF");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF,FF");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF,FF");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF,FF");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF,FF");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF,FF");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF,FF");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF,FF");

		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91,FF");
		this.data.push("FF,95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84,FF");
		this.data.push("FF,91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72,FF");
		this.data.push("FF,84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95,FF");
		this.data.push("FF,72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90,FF");

		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("90,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,91");
		this.data.push("95,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("91,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,72");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,95");
		this.data.push("72,84,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,84,90");
		this.data.push("84,70,86,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,88,72,84");
		this.data.push("72,81,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,83,72");
		this.data.push("81,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,83");
	} else if (this.level == -3) { // secret level -3
		this.data.push("A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  "); // full height (23 tiles)
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,30,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,17,12,11,30,30,30,33,  ,  ,  ,A3,A0");
		this.data.push("A1,  ,  ,  ,  ,  ,17,10,30,30,33,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5,A2");
		this.data.push("A0");
		this.data.push("A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,30,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A2");
		this.data.push("  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("  ,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("  ,  ,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("A0,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1,  ,  ,  ,  ,  ,A3,A0");
		this.data.push("A1,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,16,12,11,30,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,17,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,A3,A0");
		this.data.push("A1,  ,  ,  ,  ,  ,A4,A1,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,A5,A2,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5,A2");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("A0,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,30,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1,  ,  ,  ,16,10,30,30,33");
		this.data.push("A2,  ,  ,16,12,11,32,30,30,33");
		this.data.push("  ,  ,  ,17,12,11,30,30,30,33,  ,  ,  ,  ,A3,A0");
		this.data.push("A0,  ,  ,  ,17,10,30,30,33,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5,A2");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,16,12,11,30,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,17,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A3,A0");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,A5,A2");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,30,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,17,12,11,30,30,30,33,  ,  ,  ,  ,A3,A0");
		this.data.push("A1,  ,  ,  ,  ,  ,17,10,30,30,33,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("A2,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A4,A1");
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,A5,A2");
		this.data.push("A0");
		this.data.push("A1");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,16,12,11,30,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,12,11,32,30,30,33");
		this.data.push("A1,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A2");
		this.data.push("  ,  ,  ,  ,  ,  ,16,10,30,30,33");
		this.data.push("  ,  ,  ,  ,  ,16,12,11,32,30,30,33");
		this.data.push("  ,  ,  ,  ,  ,17,12,11,30,30,30,33");
		this.data.push("A0,  ,  ,  ,  ,  ,17,10,30,30,33");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A1");
		this.data.push("A2");
	} else if (this.level == -6) { // secret level -6
		this.data.push("  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,  "); // full height (23 tiles)
		this.data.push("89");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("06");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,33");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("06");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,19");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,09");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,23");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,26");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,31");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,38");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,50");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,68");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,38");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,18");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,21");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05");
		this.data.push("05");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,24");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,27");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,25");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,22");
		this.data.push("06");
		this.data.push("00");
		this.data.push("00");
		this.data.push("04");
		this.data.push("05,41,86");
		this.data.push("06");
		this.data.push("00");
		this.data.push("87");
	}
}

Floor.prototype.render = function () {
	if (game.gamePlay.speed > 0) {
		let division = this.age * game.gamePlay.speed / game.TILE_SIZE;

		if (division == Math.floor(division)) {
			if (this.column < this.data.length) {
				var types = this.data[this.column].split(",");

				for (let index in types) {
					var type = types[index];

					if (type != "  ") {
						game.gamePlay.ground.tiles.push(new Tile(type, game.canvas.width + game.TILE_SIZE, (game.GAME_AREA_HEIGHT - game.TILE_SIZE - (index * game.TILE_SIZE))));
					}
				}

				++this.column;
			} else {
				return false;
			}
		}

		++this.age;
	}

	return true;
};

function GameHints() {
	var text = "" +
  "controls_" +
  "_" +
  "_" +
  "_" +
  "move    gamepad, arrows, esdf or ijkl_" +
  "_" +
  "fire    1, a or space bar_" +
  "_" +
  "enable  2, b or m_" +
  "_" +
  "pause   start or p_";

	var gameText = new GameText(text, "Black", null, game.GameState.BOOT);
	return gameText;
}

function GameIntro() {
	var text = "" +
"once upon a time, there was a small boat who dreamt about_" +
"flying._" +
"_" +
"_" +
"after a long journey through the seven seas, while gazing_" +
"upon the sky in a starry evening, the boat found itself in_" +
"a strange, stormy location..._" +
"_" +
"_" +
"in the blink of an eye, the boat had been teleported to_" +
"another world, ``the land where dreams come true''..._" +
"_" +
"_" +
"he soon found out that, sometimes, dreams might come with_" +
"nightmares, too._" +
"_" +
"_" +
"what you are about to see are the tales of our little hero,_" +
"``starship''...";

	var gameText = new GameText(text, "Purple", "intro", game.GameState.TITLE);
	return gameText;
}

function GameEnding() {
	var text = "" +
"after his first encounter with the most strange machines,_" +
"starship is happy with what he has accomplished._" +
"_" +
"_" +
"flying across eight realms was thrilling and full of action,_" +
"and he had the opportunity to get himself some new powers_" +
"and even some new friends._" +
"_" +
"_" +
"wheter he was unleashing the powerful light gun, releasing_" +
"torpedoes or firing quad harpoons, he stands triumphant._" +
"_" +
"_" +
"wondering if he has found all of this world's secrets,_" +
"though, starship gets set for some more action._" +
"_" +
"_" +
"so let's move on to yet another degree of adventure,_" +
"because this dream has only just begun...";

	var gameText = new GameText(text, "Purple", "intro", game.GameState.BOOT);
	return gameText;
}

function GameText(text, fillStyle, theme, nextGameState, callback) {
	this.state = 0;
	this.loop = 0;
	this.nextGameState = nextGameState;
	this.callback = callback;
	this.characters = text.split("");
	this.index = 0;
	this.fallingStarfield = new FallingStarfield(fillStyle, 1);

	if (theme) {
		game.jukebox.play(theme);
	} else {
		game.jukebox.stop();
	}
}

GameText.prototype.render = function () {
	if (game.pauseKey || game.fireKey) {
		this.die();
		return false;
	}

	this.fallingStarfield.render();
	let division = this.loop / 3;

	if (this.state == 0 && division == Math.floor(division)) {
		if (this.index == this.characters.length - 1) {
			this.state = 1;
			this.loop = 0;
		} else {
			++this.index;
		}
	}

	var x = 96; // left margin
	var y = 40; // top margin

	for (var current = 0; current < this.index + 1; ++current) {
		var character = this.characters[current];

		if (character == "_" || x > game.canvas.width - 64) {
			x = 96;
			y += 16;
		} else if (character == " ") {
			x += game.SPACE_WHITE; // space width
		} else {
			var image = document.getElementById(character + "Font");
			game.context.drawImage(image, x, y);
			x += image.width;
		}
	}

	if (this.state == 1) {
		if (this.loop == 100) {
			this.die();
			return false;
		}
	}

	++this.loop;
	return true;
};

GameText.prototype.die = function () {
	game.jukebox.fadeOut();
	game.nextGameState = this.nextGameState;
	game.gameState = game.GameState.TRANSITION;

	if (this.callback) {
		this.callback();
	}
};

function GamePlay() {
	game.jukebox.stop();
	this.isPaused = false;
	this.frameCount = 0;
	this.speed = 2;
	this.globalAnimationFrame = 0;
	this.globalAnimationLasting = 0;
	this.transition = null;
	this.isWaiting = true;

	if (!this.story) {
		this.story = new Story(this);
	}

	if (!this.starfield) {
		this.starfield = new Starfield();
	}

	if (!this.ground) {
		this.ground = new Ground();
	}

	if (!this.smoke) {
		this.smoke = new Smoke();
	}

	if (!this.fire) {
		this.fire = new Fire();
	}

	if (!this.enemyFire) {
		this.enemyFire = new EnemyFire();
	}

	this.rain = new Rain();

	if (!this.loot) {
		this.loot = new Loot();
	}

	if (!this.horde) {
		this.horde = new Horde();
	}

	if (!this.player) {
		this.player = new Player();
	}

	this.load();
}

GamePlay.prototype.save = function () {
	Core2D.save({
		"highScore": game.highScore,
		"level" : this.story.level,
		"lives" : this.player.lives,
		"loop" : this.story.loop,
		"score" : this.player.score
	});

	game.sound.play("saved");
};

GamePlay.prototype.load = function () {
	const data = Core2D.load() || {};
	this.isWaiting = false;

	if (data["lives"] > -1) {
		this.player.lives = data["lives"];
		this.player.score = data["score"];
		this.story.level = data["level"];
		this.story.loop = data["loop"];
		// game.highScore = data.highScore;

		if (this.player.lives < 0) {
			this.player.lives = 0;
		}

		if (this.player.lives > 9) {
			this.player.lives = 9;
		}

		if (this.player.score < 0) {
			this.player.score = 0;
		}

		this.player.displayScore = this.player.score;

		if (this.story.loop < 0) {
			this.story.loop = 0;
		}

		if (this.story.level < -6 || this.story.level > 7) {
			this.story.level = 0;
		}

		this.story.reset();
	}
};

GamePlay.prototype.render = function () {
	if (this.transition) {
		if (!this.transition.render()) {
			delete this.transition;
			this.frameCount = 0;
			this.speed = 2;
			this.globalAnimationFrame = 0;
			this.globalAnimationLasting = 0;
			this.story.reset();
			this.ground.reset();
			this.rain.reset();
			this.fire.reset();
			this.enemyFire.reset();
			this.loot.reset();
			this.smoke.reset();
			this.horde.reset();
			this.player.reset();
		}

		return true;
	}

	if (game.pauseKey) {
		this.pause();
	}

	if (this.isPaused || this.isWaiting) {
		return true;
	}

	this.story.render();
	this.starfield.render();
	this.ground.render();
	this.loot.render();
	this.rain.render();
	this.horde.render();
	this.smoke.render();

	if (this.globalAnimationLasting > 3) {
		this.globalAnimationLasting = 0;
		++this.globalAnimationFrame;
	} else {
		++this.globalAnimationLasting;
	}

	if (this.globalAnimationFrame > 1) {
		this.globalAnimationFrame = 0;
	}

	if (!this.player.render()) {
		--this.player.lives;
		this.save();

		if (this.player.lives < 0) {
			this.die();
			return false;
		}

		this.transition = new Transition();

	}

	this.fire.render();
	this.enemyFire.render();
	this.player.hud.render();
	++this.frameCount;
	return true;
};

GamePlay.prototype.pause = function () {
	if (!game.pauseHold) {
		game.pauseHold = true;
		this.isPaused = !this.isPaused;

		if (this.isPaused) {
			game.jukebox.pause();
			game.sound.play("pause");
		} else {
			game.jukebox.play();
		}
	}
};

GamePlay.prototype.isCollision = function (x1, y1, width1, height1, x2, y2, width2, height2) {
	return !((x1 + width1 < x2) || (y1 + height1 < y2) || (x2 + width2 < x1) || (y2 + height2 < y1));
};

GamePlay.prototype.die = function () {
	game.finalScore = this.player.score;
	game.nextGameState = game.GameState.OVER;
	game.gameState = game.GameState.TRANSITION;
};

function GameOver() {
	game.jukebox.play("over");
	this.lastFrame = 820;
	this.newHighScore = false;
	this.frameCount = 0;
	this.fallingStarfield = new FallingStarfield("SaddleBrown", -1);

	if (game.finalScore > game.highScore) {
		this.newHighScore = true;
		game.highScore = game.finalScore;

		Core2D.save({
			highScore: game.highScore
		});
	}
}

GameOver.prototype.render = function () {
	if (game.pauseKey || game.fireKey) {
		this.die();
		return false;
	}

	this.fallingStarfield.render();
	game.writeCenter("game over", 184);
	game.writeCenter((this.newHighScore ? "new high " : "") + "score", 204);
	game.writeCenter(game.finalScore, 214);

	if (this.frameCount == this.lastFrame) {
		this.die();
		return false;
	}

	++this.frameCount;
	return true;
};

GameOver.prototype.die = function () {
	game.jukebox.fadeOut();
	game.nextGameState = game.GameState.BOOT;
	game.gameState = game.GameState.TRANSITION;
};

function GameBoot() {
	this.image = document.getElementById("logoWhite");
	this.x = (game.canvas.width - this.image.width) / 2;
	this.y = game.canvas.height;
	this.yCeiling = (game.canvas.height - this.image.height) / 2;
	this.speed = 4;
	this.duration = 200;
	this.tick = 0;
}

GameBoot.prototype.render = function () {
	if (game.pauseKey || game.fireKey) {
		game.fireKey = false;
		game.pauseKey = false;
		this.die();
		return false;
	} else if (++this.tick > this.duration) {
		this.die();
		return false;
	}

	if (this.y > this.yCeiling) {
		this.y -= this.speed;
	} else {
		this.y = this.yCeiling;
	}

	game.clearScreen("RoyalBlue");
	game.context.drawImage(this.image, this.x, this.y);
	return true;
};

GameBoot.prototype.die = function () {
	game.gameState = game.GameState.INTRO;
};

function GameTitle() {
	this.image = document.getElementById("gameTitle");
	this.x = (game.canvas.width - this.image.width) / 2;
	this.y = game.canvas.height;
	this.yCeiling = 64;
	this.speed = 4;
	this.lastFrame = 300;
	this.frameCount = 0;
}

GameTitle.prototype.render = function () {
	if (this.y > this.yCeiling) {
		if (game.pauseKey || game.fireKey) {
			game.fireKey = false;
			game.pauseKey = false;
			this.y = this.yCeiling;
		} else {
			this.y -= this.speed;
		}

		game.clearScreen("DarkGreen");
		game.context.drawImage(this.image, this.x, this.y);
	} else {
		game.clearScreen("DarkGreen");
		game.context.drawImage(this.image, this.x, this.y);
		game.writeCenter("maragato 2011", 200);

		if (Math.floor(this.frameCount / 10) % 2 == 0) {
			game.writeCenter("press button or push space", 280);
		}

		if (game.pauseKey || game.fireKey) {
			game.fireKey = false;
			game.pauseKey = false;
			game.nextGameState = game.GameState.PLAY;
			this.die();
			return false;
		} else if (this.frameCount == this.lastFrame) {
			game.nextGameState = game.GameState.HINTS;
			this.die();
			return false;
		}

		++this.frameCount;
	}

	return true;
};

GameTitle.prototype.die = function () {
	game.gameState = game.GameState.TRANSITION;
};

function Ground() {
	this.tiles = new Array();
}

Ground.prototype.add = function (tile) {
	this.tiles.push(tile);
};

Ground.prototype.render = function () {
	var survivors = new Array();

	for (let index in this.tiles) {
		var tile = this.tiles[index];

		if (tile.render(game.gamePlay.speed)) {
			survivors.push(tile);
		}
	}

	this.tiles = survivors;
};

Ground.prototype.checkCollision = function (x, y, width, height, isFire) {
	for (let index in this.tiles) {
		var tile = this.tiles[index];

		if (!tile.dead && tile.solid && game.gamePlay.isCollision(x, y, width, height, tile.x, tile.y, tile.image.width, tile.image.height)) {
			if (tile.fragile && isFire) {
				tile.die();
				return 1;
			}

			return 2;
		}
	}

	return 0;
};

Ground.prototype.defrost = function () {
	for (let index in this.tiles) {
		var tile = this.tiles[index];

		if (tile.type == "04" || tile.type == "05" || tile.type == "06") {
			tile.die();
		}
	}
};

Ground.prototype.reset = function () {
	if (this.tiles) {
		delete this.tiles;
	}

	this.tiles = new Array();
};

function Horde() {
	this.enemies = new Array();
}

Horde.prototype.add = function (object) {
	this.enemies.push(object);
};

Horde.prototype.render = function () {
	var survivors = new Array();

	for (let index in this.enemies) {
		var enemy = this.enemies[index];

		if (enemy.render()) {
			survivors.push(enemy);
		}
	}

	this.enemies = survivors;
};

Horde.prototype.checkCollision = function (x, y, width, height) {
	for (let index in this.enemies) {
		var enemy = this.enemies[index];

		if (!enemy.dead) {
			if (game.gamePlay.isCollision(x, y, width, height, enemy.x, enemy.y, enemy.image.width, enemy.image.height)) {
				if (typeof(enemy.hitPoints) != "undefined") {
					if (enemy.hitPoints > 0) {
						if (enemy.boxes) {
							for (var boxIndex in enemy.boxes) {
								var box = enemy.boxes[boxIndex];

								var xBox = enemy.x + box.x;
								var yBox = enemy.y + box.y;
								var widthBox = box.width;
								var heightBox = box.height;

								if (game.gamePlay.isCollision(x, y, width, height, xBox, yBox, widthBox, heightBox)) {
									if (box.isVulnerable && enemy.state > 0) {
										enemy.diminish();
										game.gamePlay.smoke.explosions.push(new Explosion(xBox + (widthBox / 2) - 16, yBox + (heightBox / 2) - 16, false));
										game.sound.play("hit");
										return 2;
									}

									game.sound.play("armorHit");
									return 2;

								}
							}
						} else {
							enemy.diminish();
							game.sound.play("armorHit");
							return 2;
						}
					}
				} else {
					enemy.die();
					return 1;
				}
			}
		}
	}

	return 0;
};

Horde.prototype.reset = function () {
	if (this.enemies) {
		delete this.enemies;
	}

	this.enemies = new Array();
};

function HUD(player) {
	this.player = player;
	this.grid = new Array(false, false, false, true, false, false, false);
	this.load = 0;
	this.image = document.getElementById("hud");
	this.icon = document.getElementById("playerIcon");
	this.enabledCell = document.getElementById("enabled");
	this.loadedCell = document.getElementById("loaded");
	this.missileLevel = 0;
	this.dualLevel = 0;
	this.upLaserLevel = 0;
	this.laserLevel = 0;
	this.sidekickLevel = 0;
	this.shieldLevel = 0;
}

HUD.prototype.render = function () {
	game.context.fillStyle = "Black";
	game.context.fillRect(0, game.canvas.height - this.image.height, game.canvas.width, game.canvas.height);
	game.context.drawImage(this.image, 0, game.canvas.height - this.image.height);
	game.write("1p", 2, game.canvas.height - 13);
	game.context.drawImage(this.icon, 18, game.canvas.height - 13);
	game.write("x" + this.player.lives, 26, game.canvas.height - 13);

	if (this.load > 0) {
		if (this.grid[this.load - 1]) {
			// do nothing
		} else {
			var cellX = 2 + ((this.load - 1) * (this.loadedCell.width + 4));
			game.context.drawImage(this.loadedCell, cellX, game.canvas.height - this.image.height + 2);

			if (this.load == 1) {
				if (this.player.speed < 10) {
					this.loadedWeapon = game.Weapon.SPEED_UP;
					this.loadedText = "speed up ." + String(this.player.speed - 2);
				} else {
					this.loadedWeapon = game.Weapon.SLOW_DOWN;
					this.loadedText = "slow down";
				}
			} else if (this.load == 2) {
				if (this.missileLevel == 0) {
					this.loadedWeapon = game.Weapon.DOWN_TORPEDO;
					this.loadedText = "down torpedo";
				} else if (this.missileLevel == 1) {
					this.loadedWeapon = game.Weapon.UP_TORPEDO;
					this.loadedText = "up torpedo";
				}
			} else if (this.load == 3) {
				if (this.dualLevel == 0) {
					this.loadedWeapon = game.Weapon.DUAL;
					this.loadedText = "dual";
				} else if (this.dualLevel == 1) {
					this.loadedWeapon = game.Weapon.TRIPLE;
					this.loadedText = "triple";
				} else if (this.dualLevel == 2) {
					this.loadedWeapon = game.Weapon.QUAD;
					this.loadedText = "quad";
				}
			} else if (this.load == 5) {
				if (this.laserLevel == 0) {
					this.loadedWeapon = game.Weapon.LIGHT_GUN;
					this.loadedText = "light gun";
				}
			} else if (this.load == 6) {
				this.loadedWeapon = game.Weapon.SIDEKICK;
				this.loadedText = "sidekick";
			} else if (this.load == 7) {
				if (this.shieldLevel == 0) {
					this.loadedWeapon = game.Weapon.FORCE_FIELD;
					this.loadedText = "force field";
				}
			} else {
				this.loadedWeapon = null;
				this.loadedText = null;
			}

			game.writeLeft(this.loadedText, 219, game.canvas.height - 13);
		}
	}

	for (let index in this.grid) {
		if (this.grid[index] == true) {
			let cellX = 2 + ((index) * (this.enabledCell.width + 4));
			game.context.drawImage(this.enabledCell, cellX, game.canvas.height - this.image.height + 2);
		}
	}

	if (this.player.displayScore < this.player.score) {
		++this.player.displayScore;
	}

	game.writeLeft("hi " + game.highScore + " score " + this.player.displayScore, game.canvas.width - 1, game.canvas.height - 13);
};

HUD.prototype.charge = function () {
	++this.load;

	if (this.load > game.GRID_CELLS) {
		this.load = 1;
	}
};

HUD.prototype.alter = function () {
	if (this.load > 0 && !this.grid[this.load - 1]) {
		if (this.loadedWeapon == game.Weapon.SPEED_UP) {
			++this.player.speed;
		} else if (this.loadedWeapon == game.Weapon.SLOW_DOWN) {
			this.player.speed = 3;
		} else if (this.loadedWeapon == game.Weapon.DUAL) {
			this.player.centerWeapon = game.Weapon.DUAL;
			++this.dualLevel;
			this.laserLevel = 0;
			this.grid[4] = false;
		} else if (this.loadedWeapon == game.Weapon.TRIPLE) {
			this.player.centerWeapon = game.Weapon.TRIPLE;
			++this.dualLevel;
		} else if (this.loadedWeapon == game.Weapon.QUAD) {
			this.player.centerWeapon = game.Weapon.QUAD;
			++this.dualLevel;
			this.grid[this.load - 1] = true;
		} else if (this.loadedWeapon == game.Weapon.DOWN_TORPEDO) {
			this.player.downWeapon = game.Weapon.DOWN_TORPEDO;
			++this.missileLevel;
		} else if (this.loadedWeapon == game.Weapon.UP_TORPEDO) {
			this.player.upWeapon = game.Weapon.UP_TORPEDO;
			++this.missileLevel;
			this.grid[this.load - 1] = true;
		} else if (this.loadedWeapon == game.Weapon.LIGHT_GUN) {
			this.player.centerWeapon = game.Weapon.LIGHT_GUN;
			++this.laserLevel;
			this.dualLevel = 0;
			this.grid[this.load - 1] = true;
			this.grid[2] = false;
		} else if (this.loadedWeapon == game.Weapon.SIDEKICK) {
			this.player.sidekicks.push(new Sidekick(this.player));
			++this.sidekickLevel;

			if (this.sidekickLevel == game.MAX_SIDEKICKS) {
				this.grid[this.load - 1] = true;
			}
		} else if (this.loadedWeapon == game.Weapon.FORCE_FIELD) {
			this.player.forceField = new ForceField(this.player);
			this.grid[this.load - 1] = true;
		} else {
			return;
		}

		this.discharge();
	}
};

HUD.prototype.discharge = function () {
	game.sound.play("enable");
	this.load = 0;
	this.update = true;
};

function Sound() {
	this.playing = new Array();
	this.slots = new Array();
	this.currentSlot = 0;

	for (let index = 0; index < 4; ++index) {
		var audio = new Audio();
		this.slots.push(audio);
	}
}

Sound.prototype.isPlaying = function (clip) {
	for (let index in this.playing) {
		var played = this.playing[index];

		if (clip == played) {
			return true;
		}
	}

	return false;
};

Sound.prototype.play = function (clip, volume) {
	if (!this.isPlaying(clip)) {
		this.playing.push(clip);
		var audio = this.slots[this.currentSlot];
		audio.src = "assets/sounds/" + clip + ".mp3";

		if (typeof(volume) != "undefined") {
			audio.volume = volume;
		} else {
			audio.volume = 0.5;
		}

		audio.play();

		if (++this.currentSlot == this.slots.length) {
			this.currentSlot = 0;
		}
	}

	// var audio = getElementById(clip + "Sound");
	// audio.stop();
	// audio.volume = volume || 0.5;
	// audio.play();
};

Sound.prototype.render = function () {
	this.playing.length = 0;
};

Sound.prototype.stop = function () {
	for (let index in this.slots) {
		var slot = this.slots[index];
		slot.pause();
	}
};

function Jukebox() {
	var loop = function () {
		this.currentTime = 0;
		this.play();
	};

	this.slot = new Audio();
	this.slot.addEventListener("ended", loop, false);
	this.slot.volume = 1;
	this.theme = null;
	this.nextTheme = null;
	this.isFadingOut = false;
	this.isPaused = false;
	this.volume = 100;
}

Jukebox.prototype.render = function () {
	if (this.isPaused) {
		return true;
	}

	if (this.isFadingOut) {
		if (this.volume > 0) {
			--this.volume;
			this.slot.volume = this.volume / 100;
		} else {
			this.isFadingOut = false;
			this.volume = 100;

			if (this.nextTheme) {
				this.theme = null;
				this.play(this.nextTheme);
				this.nextTheme = null;
			}
		}
	}
};

Jukebox.prototype.fadeInto = function (theme) {
	this.nextTheme = theme;
	this.fadeOut();
};

Jukebox.prototype.fadeOut = function () {
	if (this.theme) {
		this.isFadingOut = true;
	}
};

Jukebox.prototype.play = function (theme) {
	if (theme) {
		this.theme = theme;
		this.slot.src = "assets/themes/" + this.theme + ".mp3";
		this.slot.volume = 1;
		this.isFadingOut = false;
		this.isPaused = false;
		this.volume = 100;
	}

	this.isPaused = false;
	this.slot.play();
};

Jukebox.prototype.pause = function () {
	this.isPaused = true;

	if (this.theme) {
		this.slot.pause();
	}
};

Jukebox.prototype.stop = function () {
	this.pause();
	this.theme = null;
	this.isFadingOut = false;
};

function Loot() {
	this.capsules = new Array();
}

Loot.prototype.add = function (capsule) {
	this.capsules.push(capsule);
};

Loot.prototype.render = function () {
	var survivors = new Array();

	for (let index in this.capsules) {
		var capsule = this.capsules[index];

		if (capsule.render()) {
			survivors.push(capsule);
		}
	}

	this.capsules = survivors;
};

Loot.prototype.reset = function () {
	if (this.capsules) {
		delete this.capsules;
	}

	this.capsules = new Array();
};

function Sidekick(player) {
	this.player = player;
	this.style = this.player.style;
	this.order = this.player.sidekicks.length + 1;
	this.x = -this.player.image.width;
	this.y = -this.player.image.height;
	this.frames = new Array();
	this.frames.push(document.getElementById("sidekick0"));
	this.frames.push(document.getElementById("sidekick1"));
	this.image = this.frames[0];
	this.centerWeaponShots = 0;
	this.downWeaponShots = 0;
	this.upWeaponShots = 0;
}

Sidekick.prototype.render = function () {
	this.x = this.player.xPath[(this.order * game.PLAYER_PATH_PRECISION) - 1];
	this.y = this.player.yPath[(this.order * game.PLAYER_PATH_PRECISION) - 1];
	game.context.drawImage(this.frames[game.gamePlay.globalAnimationFrame], this.x, this.y);
	return true;
};

function Player() {
	this.score = 0;
	this.displayScore = 0;
	this.lives = 2;
	this.dead = false;
	this.explosion = null;
	this.isVisible = true;
	this.speed = 3;
	this.frames = new Array();
	this.frames.push(document.getElementById("player0"));
	this.frames.push(document.getElementById("player1"));
	this.image = this.frames[0];
	this.frameCounter = 0;
	this.frameLasting = 3;
	this.lastingCounter = 0;
	this.constantFire = false;
	this.x = this.image.width;
	this.y = (game.GAME_AREA_HEIGHT - this.image.height) / 2;
	this.hud = new HUD(this);
	this.sidekicks = new Array();
	this.xPath = new Array();
	this.yPath = new Array();

	for (let i = 0; i < game.MAX_SIDEKICKS * game.PLAYER_PATH_PRECISION; ++i) {
		this.xPath.push(this.x);
		this.yPath.push(this.y);
	}

	this.repeatRate = 14;
	this.recoilCounter = 0;
	this.centerWeapon = game.Weapon.NORMAL;
	this.downWeapon = null;
	this.upWeapon = null;
	this.centerWeaponShots = 0;
	this.downWeaponShots = 0;
	this.upWeaponShots = 0;
	this.forceField = null;
}

Player.prototype.render = function () {
	if (this.explosion) {
		if (!this.explosion.render()) {
			delete this.explosion;
			return false;
		}

		return true;
	}

	if (game.upKey || game.downKey || game.leftKey || game.rightKey) {
		this.xPath.unshift(this.x);
		this.yPath.unshift(this.y);

		if (this.xPath.length > game.MAX_SIDEKICKS * game.PLAYER_PATH_PRECISION) {
			this.xPath.pop();
			this.yPath.pop();
		}
	}

	if (game.upKey) {
		this.y -= this.speed;

		if (this.y < 1) {
			this.y = 1;
		}
	} else if (game.downKey) {
		this.y += this.speed;

		if (this.y > game.GAME_AREA_HEIGHT - this.image.height - 1) {
			this.y = game.GAME_AREA_HEIGHT - this.image.height - 1;
		}
	}

	if (game.leftKey) {
		this.x -= this.speed;

		if (this.x < 2) {
			this.x = 2;
		}
	} else if (game.rightKey) {
		this.x += this.speed;

		if (this.x > game.canvas.width - (this.image.width * 2)) {
			this.x = game.canvas.width - (this.image.width * 2);
		}
	}

	if (game.fireKey) {
		this.fire();
	}

	if (game.enableKey) {
		this.alter();
	}

	if (this.sidekicks.length > 0) {
		for (let index in this.sidekicks) {
			var sidekick = this.sidekicks[index];

			sidekick.render();
		}
	}

	if (this.lastingCounter > this.frameLasting) {
		this.lastingCounter = 0;
		++this.frameCounter;
	} else {
		++this.lastingCounter;
	}

	if (this.frameCounter == this.frames.length) {
		this.frameCounter = 0;
	}

	this.image = this.frames[this.frameCounter];
	game.context.drawImage(this.image, this.x, this.y);

	var xBox = this.x + 4;
	var yBox = this.y + 15;
	var widthBox = 24;
	var heightBox = 8;

	if (this.forceField) {
		if (!this.forceField.render()) {
			this.forceField = null;
		}
	}

	if (game.gamePlay.enemyFire.checkCollision(xBox, yBox, widthBox, heightBox) > 0) {
		this.die();
	} else if (game.gamePlay.horde.checkCollision(xBox, yBox, widthBox, heightBox) > 0) {
		this.die();
	} else if (game.gamePlay.ground.checkCollision(xBox, yBox, widthBox, heightBox) > 0) {
		this.die();
	}

	return true;
};

Player.prototype.scoreUp = function (points) {
	for (var count = 0; count < points; ++count) {
		++this.score;
		let division = this.score / 1000; // extra life

		if (division == Math.floor(division)) {
			if (this.lives < 9) {
				++this.lives;
			} else {
				this.score += 1000;
			}

			game.sound.play("life");
		}
	}
};

Player.prototype.checkCollision = function (x, y, width, height, harm) {
	if (this.dead) {
		return false;
	} else if (game.gamePlay.isCollision(x, y, width, height, this.x + 8, this.y + 12, this.image.width - 16, this.image.height - 24)) {
		if (harm) {
			this.die();
		}

		return true;
	}

	return false;
};

Player.prototype.die = function () {
	this.dead = true;
	game.jukebox.stop();
	this.explosion = new PlayerExplosion(this.x - 16, this.y - 2);
};

Player.prototype.fire = function () {
	if (game.fireHold && this.recoilCounter < this.repeatRate) {
		++this.recoilCounter;
	} else {
		this.recoilCounter = 0;
		this.shoot(this);

		for (let index in this.sidekicks) {
			var sidekick = this.sidekicks[index];
			this.shoot(sidekick);
		}

		game.fireHold = true;
	}
};

Player.prototype.reset = function () {
	this.dead = false;
	this.isVisible = true;
	this.speed = 3;
	this.image = this.frames[0];
	this.frameCounter = 0;
	this.frameLasting = 3;
	this.lastingCounter = 0;
	this.constantFire = false;
	this.x = this.image.width;
	this.y = (game.GAME_AREA_HEIGHT - this.image.height) / 2;
	this.recoilCounter = 0;
	this.centerWeapon = game.Weapon.NORMAL;
	this.downWeapon = null;
	this.upWeapon = null;
	this.centerWeaponShots = 0;
	this.downWeaponShots = 0;
	this.upWeaponShots = 0;

	if (this.forceField) {
		delete this.forceField;
	}

	this.forceField = null;

	if (this.hud) {
		delete this.hud;
	}

	this.hud = new HUD(this);

	if (this.sidekicks) {
		delete this.sidekicks;
	}

	this.sidekicks = new Array();

	if (this.xPath) {
		delete this.xPath;
	}

	this.xPath = new Array();

	if (this.yPath) {
		delete this.yPath;
	}

	this.yPath = new Array();
};

Player.prototype.shoot = function (owner) {
	if (owner.centerWeaponShots < game.maxShotsForType(this.centerWeapon)) {
		game.gamePlay.fire.projectiles.push(new PlayerShot(owner, this.centerWeapon));
		++owner.centerWeaponShots;
	}

	if (this.upWeapon && owner.upWeaponShots < game.maxShotsForType(this.upWeapon)) {
		game.gamePlay.fire.projectiles.push(new PlayerShot(owner, this.upWeapon));
		++owner.upWeaponShots;
	}

	if (this.downWeapon && owner.downWeaponShots < game.maxShotsForType(this.downWeapon)) {
		game.gamePlay.fire.projectiles.push(new PlayerShot(owner, this.downWeapon));
		++owner.downWeaponShots;
	}
};

Player.prototype.alter = function () {
	this.hud.alter();
};

Player.prototype.charge = function () {
	this.hud.charge();
};

function PlayerExplosion(x, y) {
	this.x = x;
	this.y = y;
	this.frameCounter = 0;
	this.lastFrame = 3;
	this.frameLasting = 7;
	this.lastingCounter = 0;
	this.frames = new Array();

	for (let index = 0; index <= this.lastFrame; ++index) {
		var image = document.getElementById("playerExplosion" + index);
		this.frames.push(image);
	}

	game.sound.stop();
	game.sound.play("playerExplosion");
}

PlayerExplosion.prototype.render = function () {
	if (++this.lastingCounter > this.frameLasting) {
		this.lastingCounter = 0;
		++this.frameCounter;

		if (this.frameCounter > this.lastFrame) {
			return false;
		}
	}

	var image = this.frames[this.frameCounter];
	game.context.drawImage(image, this.x, this.y);
	return true;
};

function PlayerShot(owner, type) {
	this.owner = owner;
	this.type = type;
	this.isPiercing = false;
	this.sound = null;
	this.dead = false;

	if (this.type == game.Weapon.NORMAL) {
		this.image = document.getElementById("shot");
		this.speed = 16;
		this.x = this.owner.x + 22;
		this.y = this.owner.y + 20;
		this.sound = "shot";
	} else if (this.type == game.Weapon.DUAL) {
		this.image = document.getElementById("back");
		this.speed = 16;
		this.x = this.owner.x + 2;
		this.y = this.owner.y + 20;
		game.gamePlay.fire.projectiles.push(new PlayerShot(this.owner, game.Weapon.NORMAL));
		++this.owner.centerWeaponShots;
	} else if (this.type == game.Weapon.TRIPLE) {
		this.image = document.getElementById("up");
		this.xSpeed = 12;
		this.ySpeed = -4;
		this.x = this.owner.x + 8;
		this.y = this.owner.y + 20;
		game.gamePlay.fire.projectiles.push(new PlayerShot(this.owner, game.Weapon.DUAL));
		++this.owner.centerWeaponShots;
	} else if (this.type == game.Weapon.QUAD) {
		this.image = document.getElementById("down");
		this.xSpeed = 12;
		this.ySpeed = 4;
		this.x = this.owner.x + 8;
		this.y = this.owner.y + 20;
		game.gamePlay.fire.projectiles.push(new PlayerShot(this.owner, game.Weapon.TRIPLE));
		++this.owner.centerWeaponShots;
	} else if (this.type == game.Weapon.DOWN_TORPEDO) {
		this.centerFrame = document.getElementById("torpedo");
		this.downFrame = document.getElementById("torpedoDown");
		this.image = this.downFrame;
		this.xSpeed = 2;
		this.ySpeed = 6;
		this.x = this.owner.x + 20;
		this.y = this.owner.y + 20;

		if (game.gamePlay.ground.checkCollision(this.x, this.y, this.image.width, this.image.height + this.ySpeed) > 0) {
			this.y -= this.ySpeed;
		}
	} else if (this.type == game.Weapon.UP_TORPEDO) {
		this.centerFrame = document.getElementById("torpedo");
		this.upFrame = document.getElementById("torpedoUp");
		this.image = this.upFrame;
		this.xSpeed = 2;
		this.ySpeed = 6;
		this.x = this.owner.x + 20;
		this.y = this.owner.y + 10;

		if (game.gamePlay.ground.checkCollision(this.x, this.y - this.ySpeed, this.image.width, this.image.height) > 0) {
			this.y += this.ySpeed;
		}
	} else if (this.type == game.Weapon.LIGHT_GUN) {
		this.image = document.getElementById("lightGun");
		this.x = this.owner.x + 21;
		this.y = this.owner.y + 21;
		this.length = this.image.width;
		this.maxLength = game.LaserLength.N0;
		this.speed = 26;
		this.isPiercing = true;
		this.sound = "lightGun";
	}

	if (this.sound) {
		game.sound.play(this.sound);
	}
}

PlayerShot.prototype.render = function () {
	if (this.dead) {
		return false;
	}

	var realWidth = this.image.width;

	if (this.length) {
		realWidth = this.length;
	}

	var realX = this.x;

	if (this.xOffset) {
		realX = this.x - this.xOffset;
	}

	var realHeight = this.image.height;

	if (this.breadth) {
		realHeight = this.breadth;
	}

	var realY = this.y;

	if (this.yOffset) {
		realY = this.y - this.yOffset;
	}

	var hordeCollision = game.gamePlay.horde.checkCollision(realX, realY, realWidth, realHeight);

	if (hordeCollision == 2 || (hordeCollision > 0 && !this.isPiercing)) {
		this.die();
		return false;
	}

	if (this.length) {
		if (this.length < this.maxLength) {
			this.length += this.speed;

			if (this.length > this.maxLength) {
				this.length = this.maxLength;
			}

			this.x = this.owner.x + 21;
			this.y = this.owner.y + 21;
		}

		var xOffset = 0;

		if (this.xOffset) {
			xOffset = this.xOffset;
		}

		let groundCollision = game.gamePlay.ground.checkCollision(realX, realY, realWidth, realHeight, true);

		if (groundCollision == 2 || (groundCollision > 0 && !this.isPiercing)) {
			this.die();
			return false;
		}

		for (let i = 0; i < this.length / (this.image.width - 3); ++i) {
			game.context.drawImage(this.image, this.x - xOffset + (i * (this.image.width - 3)), this.y);
		}
	} else if (this.breadth) {
		var yOffset = 0;

		if (this.yOffset) {
			yOffset = this.yOffset;
		}

		var elements = Math.floor(this.breadth / this.image.height);
		var image;

		for (let i = 0; i < elements; i++) {
			if (i == 0 && this.topImage) {
				image = this.topImage;
			} else if (i == (elements - 1) && this.bottomImage) {
				image = this.bottomImage;
			} else {
				image = this.image;
			}

			game.context.drawImage(image, this.x, this.y - yOffset + (i * image.height));
			let groundCollision = game.gamePlay.ground.checkCollision(realX, realY, realWidth, realHeight, true);

			if (groundCollision == 2 || (groundCollision > 0 && !this.isPiercing)) {
				this.die();
				return false;
			}
		}
	} else {
		game.context.drawImage(this.image, this.x, this.y);
	}

	if (this.x > game.canvas.width || this.y > game.GAME_AREA_HEIGHT || this.y < -this.image.height || this.x < -this.image.width) {
		this.die();
		return false;
	}

	let groundCollision = game.gamePlay.ground.checkCollision(realX, realY, realWidth, realHeight, true);

	if (groundCollision == 2 || (groundCollision > 0 && !this.isPiercing)) {
		this.die();
		return false;
	}

	if (this.type == game.Weapon.NORMAL) {
		this.x += this.speed;
	} else if (this.type == game.Weapon.DUAL) {
		this.x -= this.speed;
	} else if (this.type == game.Weapon.UP_DOUBLE) {
		this.x += this.xSpeed;
		this.y -= this.ySpeed;
	} else if (this.type == game.Weapon.TRIPLE || this.type == game.Weapon.QUAD) {
		this.x += this.xSpeed;
		this.y += this.ySpeed;
	} else if (this.type == game.Weapon.DOWN_TORPEDO) {
		this.x += this.xSpeed;

		if (game.gamePlay.ground.checkCollision(this.x, this.y, (this.image.width / 2), this.image.height + this.ySpeed) > 0) {
			this.x += this.xSpeed * 2;
			this.image = this.centerFrame;
		} else {
			this.y += this.ySpeed;
			this.image = this.downFrame;
		}
	} else if (this.type == game.Weapon.UP_TORPEDO) {
		this.x += this.xSpeed;

		if (game.gamePlay.ground.checkCollision(this.x, this.y - this.ySpeed, (this.image.width / 2), this.image.height) > 0) {
			this.x += this.xSpeed * 2;
			this.image = this.centerFrame;
		} else {
			this.y -= this.ySpeed;
			this.image = this.upFrame;
		}
	} else if (this.type == game.Weapon.UP_LIGHT_GUN) {
		this.length += this.speed;
		this.y -= this.speed;
		this.xOffset = Math.floor(this.length / this.image.width) * this.image.width / 2;
	} else if (this.type == game.Weapon.DOWN_LIGHT_GUN) {
		this.length += this.speed;
		this.y += this.speed;
		this.xOffset = Math.floor(this.length / this.image.width) * this.image.width / 2;
	} else if (this.type == game.Weapon.LIGHT_GUN) {
		if (this.length == this.maxLength) {
			this.x += this.speed;
		}
	}

	return true;
};

PlayerShot.prototype.die = function () {
	this.dead = true;

	if (this.type == game.Weapon.DOWN_TORPEDO || this.type == game.Weapon.DOWN_LIGHT_GUN) {
		--this.owner.downWeaponShots;
	} else if (this.type == game.Weapon.UP_TORPEDO || this.type == game.Weapon.UP_LIGHT_GUN) {
		--this.owner.upWeaponShots;
	} else {
		--this.owner.centerWeaponShots;
	}
};

function Shield(owner) {
	this.owner = owner;
	this.x = 0;
	this.y = 0;
	this.hits = 0;
	this.dead = false;
	this.frameCounter = 0;
	this.lastFrame = 1;
	this.frameLasting = 5;
	this.lastingCounter = 0;
	this.frames = new Array();

	for (let index = 0; index <= this.lastFrame; ++index) {
		let image = document.getElementById("shield" + index);
		this.frames.push(image);
	}

	this.weakFrames = new Array();

	for (let index = 0; index <= this.lastFrame; ++index) {
		let image = document.getElementById("weakShield" + index);
		this.weakFrames.push(image);
	}
}

Shield.prototype.render = function () {
	if (this.dead) {
		return false;
	}

	if (++this.lastingCounter > this.frameLasting) {
		this.lastingCounter = 0;
		++this.frameCounter;

		if (this.frameCounter > this.lastFrame) {
			this.frameCounter = 0;
		}
	}

	if (this.hits > 8) {
		this.image = this.weakFrames[this.frameCounter];
	} else {
		this.image = this.frames[this.frameCounter];
	}

	this.x = this.owner.x + this.owner.image.width;
	this.y = this.owner.y + (this.owner.image.height / 2) - (this.image.height / 2);
	var enemyFireCollision = game.gamePlay.enemyFire.checkCollision(this.x, this.y, this.image.width, this.image.height);

	if (enemyFireCollision == 1) {
		this.diminish();
	} else if (enemyFireCollision == 2) {
		this.die();
	}

	if (game.gamePlay.horde.checkCollision(this.x, this.y, this.image.width, this.image.height) > 0) {
		this.diminish();
	}

	game.context.drawImage(this.image, this.x, this.y);
	return true;
};

Shield.prototype.diminish = function () {
	if (++this.hits > 9) {
		this.die();
	}
};

Shield.prototype.die = function () {
	this.dead = true;
	this.owner.hud.grid[7] = false;

	if (this.owner.forceField) {
		this.owner.hud.shieldLevel = 1;
	} else {
		this.owner.hud.shieldLevel = 0;
	}
};

function ForceField(owner) {
	this.owner = owner;
	this.x = 0;
	this.y = 0;
	this.hits = 0;
	this.dead = false;
	this.frames = new Array();
	this.frames.push(document.getElementById("forceField0"));
	this.frames.push(document.getElementById("forceField1"));
	this.weakFrames = new Array();
	this.weakFrames.push(document.getElementById("weakForceField0"));
	this.weakFrames.push(document.getElementById("weakForceField1"));
}

ForceField.prototype.render = function () {
	if (this.dead) {
		return false;
	}

	if (this.hits > 3) {
		this.image = this.weakFrames[game.gamePlay.globalAnimationFrame];
	} else {
		this.image = this.frames[game.gamePlay.globalAnimationFrame];
	}

	this.x = this.owner.x - 1;
	this.y = this.owner.y - 1;
	var enemyFireCollision = game.gamePlay.enemyFire.checkCollision(this.x, this.y, this.image.width, this.image.height);

	if (enemyFireCollision == 1) {
		this.diminish();
	} else if (enemyFireCollision == 2) {
		this.die();
		this.owner.die();
	}

	if (game.gamePlay.horde.checkCollision(this.x, this.y, this.image.width, this.image.height) > 0) {
		this.diminish();
	}

	game.context.drawImage(this.image, this.x, this.y);
	return true;
};

ForceField.prototype.diminish = function () {
	if (++this.hits > 4) {
		this.die();
	}
};

ForceField.prototype.die = function () {
	this.dead = true;
	this.owner.hud.grid[6] = false;
};

function Smoke() {
	this.explosions = new Array();
}

Smoke.prototype.render = function () {
	var survivors = new Array();

	for (let index in this.explosions) {
		var explosion = this.explosions[index];

		if (explosion.render()) {
			survivors.push(explosion);
		}
	}

	this.explosions = survivors;
};

Smoke.prototype.reset = function () {
	if (this.explosions) {
		delete this.explosions;
	}

	this.explosions = new Array();
};

function Sortie(type, mode) {
	this.type = type;
	this.mode = mode;
	this.age = 0;
	this.launched = 0;
	this.casualities = 0;
}

Sortie.prototype.render = function () {
	let division = this.age * 4 / 32; // trooper speed / trooper size

	if (division == Math.floor(division)) {
		if (this.mode == 0) {
			game.gamePlay.horde.enemies.push(new Enemy(this.type, game.canvas.width, 288, this));
		} else {
			game.gamePlay.horde.enemies.push(new Enemy(this.type, game.canvas.width, 32, this));
		}

		++this.launched;
	}

	++this.age;

	if (this.launched < game.SORTIE_SIZE) {
		return true;
	}

	return false;

};

Sortie.prototype.add = function (type, x, y) {
	game.myComponents.push(new Enemy(type, x, y));
};

function Stage(level) {
	this.level = level;
	this.floor = new Floor(this.level);
	this.sortie;
	this.boss;
	this.loop = 0;
	this.state = game.StageState.ENTERING;
	this.oldState = this.state;
	var fillStyleSet = 0;
	var frequency = 8;
	var density = 4;

	if (game.gamePlay) {
		fillStyleSet = game.gamePlay.story.loop % 2;
		frequency = 8 - Math.floor(game.gamePlay.story.loop / 2);
		density = 4 - Math.floor(game.gamePlay.story.loop / 3);

		if (this.level < 0) {
			frequency = 6 - Math.floor(game.gamePlay.story.loop / 2);
			density = 3 - Math.floor(game.gamePlay.story.loop / 3);
		}
	}

	this.fillStyle = game.FillStyles[fillStyleSet][this.level];
	this.frequency = frequency > 2 ? frequency : 2;
	this.density = density > 3 ? density : 3;
}

Stage.prototype.render = function () {
	if (this.state != this.oldState) {
		this.oldState = this.state;
		this.loop = 0;
	}

	if (this.state == game.StageState.ENTERING) {
		if (this.loop == 0) {
			game.jukebox.play("stageTheme" + this.level);
		}

		if (this.level >= 0) {
			this.state = game.StageState.WAVES;
		} else {
			this.state = game.StageState.GROUND;
		}
	} else if (this.state == game.StageState.WAVES) {
		if (this.sortie && !this.sortie.render()) {
			delete this.sortie;
			this.sortie = null;
		}

		let division = this.loop / 100;

		if (division == Math.floor(division)) {
			this.sortie = new Sortie(game.Enemy.PROPELLER, (this.loop / 100) % 2 == 0 ? 0 : 1);
		}

		if (this.loop == 1000 - (this.level * 100)) {
			this.state = game.StageState.GROUND;
		}
	} else if (this.state == game.StageState.GROUND) {

		let division = this.loop / this.frequency; // enemy frequency

		if (division == Math.floor(division)) {
			if (game.random(this.density) == 0) { // enemy density
				this.summon();
			}
		}

		if (this.level == 0) {
			if (this.loop == 1536) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 240));
			}
		} else if (this.level == 1) {
			if (this.loop == 1416) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 192));
			} else if (this.loop == 1752) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 144));
			} else if (this.loop == 1976) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 80));
			} else if (this.loop == 2152) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 208));
			} else if (this.loop == 2160) {
				game.gamePlay.loot.add(new Secret(game.canvas.width, 240));
			}
		} else if (this.level == 2) {
			if (this.loop == 1048) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 1432) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 1624) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 1816) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 2096) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 2392) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 2496) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 2776) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 2784) {
				game.gamePlay.loot.add(new Secret(game.canvas.width, 320));
			} else if (this.loop == 2968) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 3048) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			} else if (this.loop == 3304) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 288));
			}
		} else if (this.level == 3) {
			if (this.loop == 24) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 272));
			} else if (this.loop == 32) {
				game.gamePlay.loot.add(new Secret(game.canvas.width, 304));
			}
		} else if (this.level == 6) {
			if (this.loop > 712 && this.loop < 1832) {
				if (this.loop == 1344) {
					game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON, game.canvas.width, 256));
				} else if (this.loop == 1352) {
					game.gamePlay.loot.add(new Secret(game.canvas.width, 288));
				}

				let division = this.loop / this.frequency; // enemy frequency

				if (division == Math.floor(division)) {
					if (game.random(this.density) == 0) { // enemy density
						game.gamePlay.horde.add(new Enemy(game.Enemy.MINE));
					}
				}

				division = this.loop / (this.frequency * 8); // enemy frequency

				if (division == Math.floor(division)) {
					if (game.random(this.density / 2) == 0) { // enemy density
						game.gamePlay.horde.add(new Enemy(game.Enemy.CANNON));
					}
				}
			}
		} else if (this.level == 7) {
			if (this.loop == 152) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 152));
			} else if (this.loop == 312) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 40));
			} else if (this.loop == 552) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 152));
			} else if (this.loop == 792) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 152));
			} else if (this.loop == 952) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 264));
			} else if (this.loop == 1192) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 40));
			} else if (this.loop == 1352) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 152));
			} else if (this.loop == 1816) {
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 40));
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 152));
				game.gamePlay.horde.add(new Enemy(game.Enemy.SIDE_CANNON, game.canvas.width, 264));
			}
		}

		if (this.floor && !this.floor.render()) {
			if (this.level >= 0) {
				game.gamePlay.speed = 0;
				game.jukebox.fadeInto("boss");
				this.state = game.StageState.STOP;
			} else {
				this.state = game.StageState.ENDING;
			}
		}
	} else if (this.state == game.StageState.STOP) {
		if (this.level == 0) {
			let division = this.loop / (this.frequency - 1); // enemy frequency

			if (division == Math.floor(division)) {
				if (game.random(this.density * 2) == 0) { // enemy density
					var spot = game.random(4);

					if (spot == 0) {
						game.gamePlay.horde.add(new Enemy(game.Enemy.WALKER, -32, 2));
					} else if (spot == 1) {
						game.gamePlay.horde.add(new Enemy(game.Enemy.WALKER, 200, 2));
					} else if (spot == 2) {
						game.gamePlay.horde.add(new Enemy(game.Enemy.WALKER, 400, 2));
					} else if (spot == 3) {
						game.gamePlay.horde.add(new Enemy(game.Enemy.WALKER, 640, 2));
					}
				}
			}
		} else if (this.level == 2) {
			let division = this.loop / (this.frequency - 1); // snowflake frequency

			if (division == Math.floor(division)) {
				if (game.random(this.density) == 1) { // snowflake density
					game.gamePlay.rain.add(new Snowflake());
				}
			}

			division = this.loop / (this.frequency - 1); // enemy frequency

			if (division == Math.floor(division)) {
				if (game.random(this.density) == 0) { // enemy density
					game.gamePlay.horde.add(new Enemy(game.Enemy.MISSILE));
				}
			}
		} else if (this.level == 5) {
			let division = this.loop / (this.frequency - 1); // enemy frequency

			if (division == Math.floor(division)) {
				if (game.random(this.density * 2) == 1) { // enemy density
					game.gamePlay.horde.add(new Enemy(game.Enemy.LIGHTNING));
				}
			}

			division = this.loop / (this.frequency - 1); // enemy frequency

			if (division == Math.floor(division)) {
				if (game.random(8) == 1) { // enemy density
					game.gamePlay.horde.add(new Enemy(game.Enemy.WALKER));
				}
			}
		} else if (this.level == 6) {
			let division = this.loop / (this.frequency - 1); // enemy frequency

			if (division == Math.floor(division)) {
				if (game.random(this.density + 1) == 1) { // enemy density
					var enemy = new Enemy(game.Enemy.MINE);
					enemy.speed = 2;

					if (game.random(2) == 1) {
						enemy.x = 0 - enemy.image.width;
					} else {
						enemy.y = game.GAME_AREA_HEIGHT;
						enemy.x = game.random(game.canvas.width - enemy.image.width);
					}

					game.gamePlay.horde.add(enemy);
				}
			}
		} else {
			let division = this.loop / (this.frequency - 1); // enemy frequency

			if (division == Math.floor(division)) {
				if (game.random(this.density) == 1) { // enemy density
					this.summon();
				}
			}
		}

		if (this.loop == 800) {
			game.gamePlay.speed = 2;

			this.boss = new Boss(this.level);
			game.gamePlay.horde.enemies.push(this.boss);
			this.state = game.StageState.BOSS;

			if (this.level == 6) {
				game.gamePlay.ground.defrost();
			}
		}
	} else if (this.state == game.StageState.BOSS) {
		if (this.boss.dead) {
			return false;
		}
	} else if (this.state == game.StageState.ENDING) {
		if (this.loop == 160) {
			game.jukebox.fadeOut();
		} else if (this.loop > 336) {
			return false;
		}
	}

	if (this.level == 2) {
		let division = this.loop / (this.frequency - 1); // snowflake frequency

		if (division == Math.floor(division)) {
			if (game.random(this.density) == 1) { // snowflake density
				game.gamePlay.rain.add(new Snowflake());
			}
		}
	}

	++this.loop;
	return true;
};

Stage.prototype.summon = function () {
	game.gamePlay.horde.enemies.push(new Enemy(game.StageEnemies[this.level][game.random(game.StageEnemies[this.level].length)]));
};

function Star(x, y) {
	this.color = game.random(2) == 1 ? "Cyan" : "Yellow";
	this.x = x;
	this.y = y;
	this.size = 1 + game.random(2); // max star size
}

Star.prototype.render = function () {
	if (game.gamePlay.speed > 0) {
		this.x -= (game.gamePlay.speed / 2) * (this.size / 2);
	}

	if (this.x < this.size - 1) {
		return false;
	} else if (game.random(20) != 0) { // Star blink chance
		game.context.fillStyle = this.color;
		game.context.fillRect(this.x, this.y, this.size, this.size);
	}

	return true;
};

Star.prototype.recycle = function () {
	this.x = game.canvas.width + this.x + 2;
};

function Starfield() {
	this.stars = new Array();

	for (var x = 0; x < game.canvas.width; ++x) {
		for (var y = 0; y < game.GAME_AREA_HEIGHT - 2 + 1; ++y) {
			if (game.random(2000) == 1) { // starfield density
				var star = new Star(x, y);
				this.stars.push(star);
			}
		}
	}
}

Starfield.prototype.render = function () {
	game.context.fillStyle = game.gamePlay.story.stage.fillStyle;
	game.context.fillRect(0, 0, game.canvas.width, game.GAME_AREA_HEIGHT);

	for (let index in this.stars) {
		var star = this.stars[index];

		if (!star.render()) {
			star.recycle();
		}
	}
};

function FallingStar(owner, x, y) {
	this.owner = owner;
	this.x = x;
	this.y = y;
	this.color = game.random(2) == 1 ? "Cyan" : "Yellow";
	this.size = 1 + game.random(2); // max star size
}

FallingStar.prototype.render = function () {
	this.y += (this.size / 2) * this.owner.speed;

	if (this.y > game.canvas.height - 1) {
		return false;
	} else if (game.random(20) != 0) { // FallingStar blink chance
		game.context.fillStyle = this.color;
		game.context.fillRect(this.x, this.y, this.size, this.size);
	}

	return true;
};

FallingStar.prototype.recycle = function () {
	this.y = -2;
};

function FallingStarfield(fillStyle, speed) {
	this.fillStyle = fillStyle;
	this.speed = speed;
	this.stars = new Array();

	for (var y = 0; y < game.canvas.height; ++y) {
		for (var x = 0; x < game.canvas.width; ++x) {
			if (game.random(2000) == 1) { // starfield density
				var star = new FallingStar(this, x, y);
				this.stars.push(star);
			}
		}
	}
}

FallingStarfield.prototype.render = function () {
	game.context.fillStyle = this.fillStyle;
	game.context.fillRect(0, 0, game.canvas.width, game.canvas.height);

	for (let index in this.stars) {
		var star = this.stars[index];

		if (!star.render()) {
			star.recycle();
		}
	}
};

function Story(gamePlay) {
	this.gamePlay = gamePlay;
	this.loop = 0;
	this.level = 0; // start level
	this.secret = false;
	this.stage = new Stage(this.level);
}

Story.prototype.render = function () {
	if (!this.stage.render()) {
		//this.stage.die();
		if (this.secret) {
			this.secret = false;
			this.level = 0 - this.level;
		} else {
			if (this.level < 0) {
				this.level = 0 - this.level;
			}

			++this.level;

			if (this.level > 7) { // end level
				this.loop++;
				this.level = 0;
				game.jukebox.fadeOut();
				game.nextGameState = game.GameState.ENDING;
				game.gameState = game.GameState.TRANSITION;
			}
		}

		this.stage = new Stage(this.level);
		this.gamePlay.save();
	}
};

Story.prototype.reset = function () {
	delete this.stage;
	this.stage = new Stage(this.level);
};

function Tile(type, x, y) {
	this.type = type;
	this.x = x;
	this.y = y;
	this.dead = false;
	this.animated = this.isAnimated();
	this.fragile = this.isFragile();
	this.solid = this.isSolid();
	this.image = document.getElementById("tile" + type);

	if (this.animated) {
		this.alternateImage = document.getElementById("tile" + type + "_");
	}
}

Tile.prototype.die = function () {
	game.gamePlay.player.scoreUp(1);
	this.dead = true;
	game.sound.play("enemyExplosion");
	game.gamePlay.smoke.explosions.push(new TinyExplosion(this.x, this.y));

	if (game.LeftOver[this.type]) {
		game.gamePlay.ground.add(new Tile(game.LeftOver[this.type], this.x, this.y));
	}
};

Tile.prototype.render = function (speed) {
	if (this.dead) {
		return false;
	}

	this.x -= speed;

	if (this.x + this.image.width < 0) {
		return false;
	}

	if (this.animated && game.gamePlay.globalAnimationFrame > 0) {
		game.context.drawImage(this.alternateImage, this.x, this.y);
	} else {
		game.context.drawImage(this.image, this.x, this.y);
	}

	return true;
};

Tile.prototype.isAnimated = function () {
	for (let index in game.AnimatedTiles) {
		var animatedTile = game.AnimatedTiles[index];

		if (this.type == animatedTile) {
			return true;
		}
	}

	return false;
};

Tile.prototype.isFragile = function () {
	for (let index in game.FragileTiles) {
		var fragileTile = game.FragileTiles[index];

		if (this.type == fragileTile) {
			return true;
		}
	}

	return false;
};

Tile.prototype.isSolid = function () {
	for (let index in game.HollowTiles) {
		var hollowTile = game.HollowTiles[index];

		if (this.type == hollowTile) {
			return false;
		}
	}

	return true;
};

function Transition() {
	this.x = 0;
	game.context.fillStyle = "Black";
}

Transition.prototype.render = function () {
	this.x += 16;

	if (this.x > game.canvas.width) {
		return false;
	}

	game.context.fillRect(0, 0, this.x, game.canvas.height);
	return true;

};

function getGamepads() {
	return navigator.getGamepads && navigator.getGamepads() || [];
}

game.main();
