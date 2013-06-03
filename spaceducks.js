//******************************************************************************
// main
//******************************************************************************

game = null;

function main()
{
	game = new Game();

	setTimeout(function() { game.start(); }, 0);
}

//******************************************************************************
// Game
//******************************************************************************

Game = function()
{
	this.width = 0;
	this.height = 0;

	this.backbuffer = {};
	this.backbuffer.canvas = document.createElement("canvas");
	this.backbuffer.context = this.backbuffer.canvas.getContext("2d");

	this.frontbuffer = {};
	this.frontbuffer.canvas = document.getElementById("canvas");
	this.frontbuffer.context = this.frontbuffer.canvas.getContext("2d");

	this.dt = 30;
	this.time = 0;
	this.accumulator = 0;
	this.framePercent = 0;
	this.interpolate = true;

	this.images = {};
	this.images["duck"] = document.getElementById("duck");

	this.background = null;
	this.ducks = [];
	this.maxDucks = 100;
	this.shake = 0;
	this.shakeOffset = { x: 0, y: 0 };
}

Game.prototype.start = function()
{
	this.frontbuffer.canvas.setAttribute('unselectable', 'on');
	document.onselectstart = function() { return false; };

	window.onresize    = function()  { game.resize(); };
	window.onmousedown = function(e) { game.mouse(e.clientX, e.clientY, true); };
	window.onmouseup   = function(e) { game.mouse(e.clientX, e.clientY, false); };
	window.onkeydown   = function(e) { game.keyboard(e.keyCode || e.which, true); };
	window.onkeyup     = function(e) { game.keyboard(e.keyCode || e.which, false); };

	this.resize();

	var nDucks = 1000;
	this.ducks.length = nDucks;

	for (var i = 0; i < nDucks; i++)
		this.ducks[i] = new Duck();

	this.time = Date.now();
	this.loop();
}

Game.prototype.loop = function()
{
	var dt = this.dt;
	var dts = dt / 1000;
	var t = Date.now();
	var frameTime = Math.min(t - this.time, 250);

	this.time = t;
	this.accumulator += frameTime;

	while (this.accumulator >= dt)
	{
		this.update(dts);
		this.accumulator -= dt;
	}

	var percent = this.interpolate ? this.accumulator / dt : 1;

	this.draw(this.backbuffer.context, percent);
	this.frontbuffer.context.drawImage(this.backbuffer.canvas, 0, 0);

	requestAnimationFrame(function() { game.loop() });
}

Game.prototype.update = function(dt)
{
	var ducks = this.ducks;
	var nDucks = ducks.length;

	for (var i = 0; i < nDucks; i++)
	{
		if (!ducks[i].gone)
		{
			ducks[i].update(dt);
		}
		else if (i < this.maxDucks && rand(0, 1000) < (this.width / 400) * (1000 / 30) * dt)
		{
			ducks[i].spawn();
			ducks[i].update(dt);
		}
	}

	if (this.shake > 0)
		this.shake -= dt;
}

Game.prototype.draw = function(context, percent)
{
	this.framePercent = percent;

	context.save();
	context.fillStyle = this.background;
	context.fillRect(0, 0, this.width, this.height);

	if (this.shake > 0)
	{
		this.shakeOffset.x = rand(-5, 5);
		this.shakeOffset.y = rand(-5, 5);

		context.translate(this.shakeOffset.x, this.shakeOffset.y);
	}

	var ducks = this.ducks;
	var nDucks = ducks.length;

	for (var i = 0; i < nDucks; i++)
	{
		if (!ducks[i].gone)
			ducks[i].draw(context, percent);
	}

	context.restore();
}

Game.prototype.resize = function()
{
	this.width = this.frontbuffer.canvas.offsetWidth;
	this.height = this.frontbuffer.canvas.offsetHeight;

	this.frontbuffer.canvas.width  = this.width;
	this.frontbuffer.canvas.height = this.height;
	this.backbuffer.canvas.width   = this.width;
	this.backbuffer.canvas.height  = this.height;

	this.background = this.backbuffer.context.createLinearGradient(0, 0, 0, this.height);
	this.background.addColorStop(0, "#00F");
	this.background.addColorStop(1, "#FFF");
}

Game.prototype.mouse = function(x, y, pressed)
{
	if (pressed)
	{
		if (this.shake > 0)
		{
			x += this.shakeOffset.x;
			y += this.shakeOffset.y;
		}

		this.shake = 0.3 + rand(0, 0.2);

		var ducks = this.ducks;
		var nDucks = ducks.length;

		for (var i = nDucks - 1; i >= 0; i--)
		{
			if (!ducks[i].gone && ducks[i].collides(x, y, this.framePercent))
			{
				ducks[i].gone = true;
				break;
			}
		}
	}
}

Game.prototype.keyboard = function(key, pressed)
{
	if (!pressed && key == 32)
		this.interpolate = !this.interpolate;
}

//******************************************************************************
// Duck
//******************************************************************************

Duck = function()
{
	this.position = { x: 0, y: 0 };
	this.velocity = { x: 0, y: 0 };
	this.prevpos = { x: 0, y: 0 };
	this.prevangle = 0;
	this.angle = 0;
	this.angleVelocity = 0;
	this.center = { x: 25, y: 25 }
	this.image = game.images["duck"];
	this.gone = true;
}

Duck.prototype.spawn = function()
{
	var dir = rand(225, 315) * (Math.PI / 180);
	var vel = rand(20, 1000);

	this.position.x = rand(0, game.width);
	this.position.y = -60;
	this.angle = rand(0, 360) * (Math.PI / 180);
	this.velocity.x = vel * Math.cos(dir);
	this.velocity.y = vel * -Math.sin(dir);
	this.angleVelocity = rand(-720, 720) * (Math.PI / 180);

	this.prevangle = this.angle;
	this.prevpos.x = this.position.x;
	this.prevpos.y = this.position.y;

	this.gone = false;
}

Duck.prototype.collides = function(x, y, framePercent)
{
	var deltax = lerp(this.prevpos.x, this.position.x, framePercent) - x;
	var deltay = lerp(this.prevpos.y, this.position.y, framePercent) - y;

	if (Math.sqrt(deltax * deltax + deltay * deltay) < 25)
		return true;

	return false;
}

Duck.prototype.update = function(dt)
{
	if (this.position.y > game.height + 120 || this.position.x < -120 || this.position.x > game.width + 120)
	{
		this.gone = true;
		return;
	}

	this.prevangle = this.angle;
	this.prevpos.x = this.position.x;
	this.prevpos.y = this.position.y;

	this.position.x += this.velocity.x * dt;
	this.position.y += this.velocity.y * dt;

	this.angle += this.angleVelocity * dt;
}

Duck.prototype.draw = function(context, percent)
{
	context.save();
	context.translate(lerp(this.prevpos.x, this.position.x, percent), lerp(this.prevpos.y, this.position.y, percent));
	context.rotate(lerp(this.prevangle, this.angle, percent));
	context.drawImage(this.image, -this.center.x, -this.center.y);
	// context.fillStyle = "rgba(255, 0, 0, 0.5)";
	// context.beginPath();
	// context.arc(0, 0, 25, 0, 2 * Math.PI);
	// context.fill();
	context.restore();
}

//******************************************************************************
// Global helpers
//******************************************************************************

function rand(min, max)
{
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function lerp(a, b, percent)
{
	return a + (b - a) * percent;
}

(function()
{
	requestAnimationFrame = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback) { setTimeout(callback, 1000 / 60); };
})();
