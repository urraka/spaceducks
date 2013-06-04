//******************************************************************************
// main
//******************************************************************************

game = null;

function main()
{
	game = new Game();
	game.start();
}

//******************************************************************************
// Game
//******************************************************************************

function Game() {}

Game.prototype.start = function()
{
	this.width = 0;
	this.height = 0;

	this.frontbuffer = {};
	this.frontbuffer.canvas = document.getElementById("canvas");
	this.frontbuffer.canvas.setAttribute('unselectable', 'on');
	this.frontbuffer.context = this.frontbuffer.canvas.getContext("2d");

	this.backbuffer = {};
	this.backbuffer.canvas = document.createElement("canvas");
	this.backbuffer.context = this.backbuffer.canvas.getContext("2d");

	this.particlebuffer = {};
	this.particlebuffer.canvas = document.createElement("canvas");
	this.particlebuffer.context = this.particlebuffer.canvas.getContext("2d");

	this.dt = 30;
	this.time = 0;
	this.accumulator = 0;
	this.framePercent = 0;
	this.interpolate = true;

	this.images = {};
	this.images["duck"] = document.getElementById("duck");
	this.images["duckhead"] = document.getElementById("duckhead");

	var particleRadius = 3;

	this.images["particle"] = document.createElement("canvas");
	this.images["particle"].width = particleRadius * 2;
	this.images["particle"].height = particleRadius * 2;

	var ctx = this.images["particle"].getContext("2d");
	var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particleRadius);
	gradient.addColorStop(0, "#F00");
	gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
	ctx.fillStyle = gradient;
	ctx.translate(particleRadius, particleRadius);
	ctx.fillRect(-particleRadius, -particleRadius, 2 * particleRadius, 2 * particleRadius);

	this.background = null;
	this.ducks = [];
	this.maxDucks = 100;
	this.shake = 0;
	this.shakeOffset = { x: 0, y: 0 };

	this.resize();

	var nDucks = 1000;
	this.ducks.length = nDucks;

	for (var i = 0; i < nDucks; i++)
		this.ducks[i] = new Duck();

	this.duckPiece = new DuckPiece();
	this.duckPiece.image = this.images["duckhead"];
	this.duckPiece.center.x = 25;
	this.duckPiece.center.y = 30;

	document.onselectstart = function()  { return false; };
	window.onresize        = function()  { game.resize(); };
	window.onmousedown     = function(e) { game.mouse(e.clientX, e.clientY, true); };
	window.onmouseup       = function(e) { game.mouse(e.clientX, e.clientY, false); };
	window.onkeydown       = function(e) { game.keyboard(e.keyCode || e.which, true); };
	window.onkeyup         = function(e) { game.keyboard(e.keyCode || e.which, false); };

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

	this.duckPiece.update(dt);
}

Game.prototype.draw = function(context, percent)
{
	this.framePercent = percent;

	var partctx = this.particlebuffer.context;
	partctx.setTransform(1, 0, 0, 1, 0, 0); // identity

	context.save();
	context.fillStyle = this.background;
	context.fillRect(0, 0, this.width, this.height);

	if (this.shake > 0)
	{
		var x = rand(-5, 5);
		var y = rand(-5, 5);

		this.shakeOffset.x = x;
		this.shakeOffset.y = y;

		context.translate(x, y);
		partctx.translate(x, y);
	}

	var ducks = this.ducks;
	var nDucks = ducks.length;

	for (var i = 0; i < nDucks; i++)
	{
		if (!ducks[i].gone)
			ducks[i].draw(context, percent);
	}

	this.duckPiece.draw(context, percent);

	context.restore();
}

Game.prototype.resize = function()
{
	this.width = this.frontbuffer.canvas.offsetWidth;
	this.height = this.frontbuffer.canvas.offsetHeight;

	this.frontbuffer.canvas.width     = this.width;
	this.frontbuffer.canvas.height    = this.height;
	this.backbuffer.canvas.width      = this.width;
	this.backbuffer.canvas.height     = this.height;
	this.particlebuffer.canvas.width  = this.width;
	this.particlebuffer.canvas.height = this.height;

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
// Entity
//******************************************************************************

Entity = function()
{
	this.prevang  = 0;
	this.prevpos  = { x: 0, y: 0, z: 0 };

	this.angle    = 0;
	this.angvel   = 0;
	this.position = { x: 0, y: 0, z: 0 };
	this.velocity = { x: 0, y: 0, z: 0 };
}

Entity.prototype.update = function(dt)
{
	this.prevang   = this.angle;
	this.prevpos.x = this.position.x;
	this.prevpos.y = this.position.y;
	this.prevpos.z = this.position.z;

	this.angle      += this.angvel * dt;
	this.position.x += this.velocity.x * dt;
	this.position.y += this.velocity.y * dt;
	this.position.z += this.velocity.z * dt;
}

//******************************************************************************
// Duck
//******************************************************************************

Duck.prototype = new Entity();

function Duck()
{
	Entity.call(this);

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
	this.velocity.x = vel * Math.cos(dir);
	this.velocity.y = vel * -Math.sin(dir);
	this.angle      = rand(0,    360) * (Math.PI / 180);
	this.angvel     = rand(-720, 720) * (Math.PI / 180);

	this.prevang   = this.angle;
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

Duck.prototype.withinBounds = function()
{
	return this.position.y <= game.height + 120 && this.position.x >= -120 && this.position.x <= game.width + 120;
}

Duck.prototype.update = function(dt)
{
	this.gone = !this.withinBounds();

	if (!this.gone)
		Entity.prototype.update.call(this, dt);
}

Duck.prototype.draw = function(context, percent)
{
	var x = lerp(this.prevpos.x, this.position.x, percent);
	var y = lerp(this.prevpos.y, this.position.y, percent);
	var a = lerp(this.prevang, this.angle, percent);

	context.save();
	context.translate(x, y);
	context.rotate(a);
	context.drawImage(this.image, -this.center.x, -this.center.y);

	if (false)
	{
		context.fillStyle = "rgba(255, 0, 0, 0.5)";
		context.beginPath();
		context.arc(0, 0, 25, 0, 2 * Math.PI);
		context.closePath();
		context.fill();
	}

	context.restore();
}

//******************************************************************************
// BloodEmitter
//******************************************************************************

BloodEmitter.prototype = new Entity();

function BloodEmitter(particleImage)
{
	Entity.call(this);

	this.max = 500;
	this.particles = [];
	this.particles.length = this.max;
	this.count = 0;
	this.emissionRate = 300;
	this.emitCounter = 0;
	this.elapsed = 0;
	this.particleImage = particleImage;

	for (var i = 0; i < this.max; i++)
		this.particles[i] = new Particle();
}

BloodEmitter.prototype.update = function(dt)
{
	Entity.prototype.update.call(this, dt);

	this.elapsed += dt;

	var rate = 1.0 / this.emissionRate;
	this.emitCounter += dt;

	while (this.count < this.max && this.emitCounter > rate)
	{
		this.add();
		this.emitCounter -= rate;
	}

	for (var i = 0; i < this.count; i++)
	{
		var particle = this.particles[i];

		particle.update(dt);

		if (particle.life <= 0)
		{
			this.particles[i] = this.particles[this.count - 1];
			this.particles[this.count - 1] = particle;
			this.count--;
			i--;
		}
	}
}

BloodEmitter.prototype.draw = function(context, percent)
{
	var x = lerp(this.prevpos.x, this.position.x, percent);
	var y = lerp(this.prevpos.y, this.position.y, percent);
	var z = lerp(this.prevpos.z, this.position.z, percent);
	var s = Math.exp(z);

	context.save();
	context.translate(x, y);
	context.scale(s, s);

	context.globalCompositeOperation = "lighter";

	for (var i = 0; i < this.count; i++)
	{
		var particle = this.particles[i];
		var x = lerp(particle.prevpos.x, particle.position.x, percent);
		var y = lerp(particle.prevpos.y, particle.position.y, percent);
		var life = lerp(particle.prevlife, particle.life, percent);

		context.globalAlpha = 1 - Math.log((1 - life / 0.6) * 2.71827);
		context.drawImage(this.particleImage, x - this.particleImage.width / 2, y - this.particleImage.height / 2);
	}

	context.restore();
}

BloodEmitter.prototype.add = function()
{
	if (this.count < this.max)
	{
		var dirAngle = this.angle - 0.5 * Math.PI;
		var dirMagnitude = rand(-1, 1);

		var x = dirMagnitude * Math.cos(dirAngle);
		var y = dirMagnitude * -Math.sin(dirAngle);
		var life = 0.8;
		var angle = this.angle + rand(-10, 10) * Math.PI / 180;
		var speed = rand(200, 230);

		this.particles[this.count].reset(x, y, life, angle, speed);
		this.count++;
	}
}

//******************************************************************************
// Particle
//******************************************************************************

Particle.prototype = new Entity();

function Particle()
{
	Entity.call(this);

	this.prevlife = 0;
	this.life = 0;
}

Particle.prototype.reset = function(x, y, life, angle, speed)
{
	this.prevlife = life;
	this.life = life;
	this.prevpos.x  = x;
	this.prevpos.y  = y;
	this.position.x = x;
	this.position.y = y;
	this.velocity.x = speed * Math.cos(angle);
	this.velocity.y = speed * Math.sin(angle);
}

Particle.prototype.update = function(dt)
{
	Entity.prototype.update.call(this, dt);

	this.prevlife = this.life;
	this.life -= dt;
}

//******************************************************************************
// DuckPiece
//******************************************************************************

DuckPiece.prototype = new BloodEmitter();

function DuckPiece()
{
	BloodEmitter.call(this, game.images["particle"]);

	this.image = null;
	this.center = { x: 0, y: 0 };

	this.velocity.x = 100;
	this.velocity.y = 80;
	this.velocity.z = -0.5;
	this.angvel = 2 * Math.PI;
}

DuckPiece.prototype.update = function(dt)
{
	BloodEmitter.prototype.update.call(this, dt);
}

DuckPiece.prototype.draw = function(context, percent)
{
	// draw blood

	var partctx = game.particlebuffer.context;

	partctx.clearRect(0, 0, game.width, game.height);
	BloodEmitter.prototype.draw.call(this, partctx, percent);

	context.save();
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.drawImage(game.particlebuffer.canvas, 0, 0);
	context.restore();

	// draw duck piece

	var x = lerp(this.prevpos.x, this.position.x, percent);
	var y = lerp(this.prevpos.y, this.position.y, percent);
	var z = lerp(this.prevpos.z, this.position.z, percent);
	var a = lerp(this.prevang, this.angle, percent);
	var s = Math.exp(z);

	context.save();
	context.translate(x, y);
	context.rotate(a);
	context.scale(s, s);
	context.drawImage(this.image, -this.center.x, -this.center.y);
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
