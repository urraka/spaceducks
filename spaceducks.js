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

	this.background = null;
	this.resize();

	// loop timing stuff

	this.dt = 30;
	this.time = 0;
	this.accumulator = 0;
	this.framePercent = 0;
	this.interpolate = true;

	// image resources

	this.images = {};
	this.images["duck"] = document.getElementById("duck");
	this.images["duckhead"] = document.getElementById("duckhead");
	this.images["duckbody"] = document.getElementById("duckbody");

	var particleRadius = 3;

	this.images["blood"] = document.createElement("canvas");
	this.images["blood"].width = particleRadius * 2;
	this.images["blood"].height = particleRadius * 2;

	var ctx = this.images["blood"].getContext("2d");
	var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particleRadius);
	gradient.addColorStop(0, "#F00");
	gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
	ctx.fillStyle = gradient;
	ctx.translate(particleRadius, particleRadius);
	ctx.fillRect(-particleRadius, -particleRadius, 2 * particleRadius, 2 * particleRadius);

	// game stuff

	this.shake = 0;
	this.shakeOffset = { x: 0, y: 0 };

	this.duckEmitter = new Emitter(this, {
		create: function(owner)           { return new Duck(); },
		update: function(owner, duck, dt) { duck.update(dt);   },
		emit:   function(owner, duck)     { duck.spawn();      },
		dead:   function(owner, duck)     { return duck.gone;  }
	});

	this.duckEmitter.init(this.width / 400, 10);

	this.duckPieces = [];
	this.duckPiecesCount = 0;

	for (var i = 0; i < 5; i++)
		this.duckPieces.push(new DuckPiece());

	// callbacks/events

	document.onselectstart = function()  { return false; };
	window.onresize        = function()  { game.resize(); };
	window.onmousedown     = function(e) { game.mouse(e.clientX, e.clientY, true); };
	window.onmouseup       = function(e) { game.mouse(e.clientX, e.clientY, false); };
	window.onkeydown       = function(e) { game.keyboard(e.keyCode || e.which, true); };
	window.onkeyup         = function(e) { game.keyboard(e.keyCode || e.which, false); };

	// call frame to start the loop

	this.time = Date.now();
	this.frame();
}

Game.prototype.frame = function()
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

	requestAnimationFrame(function() { game.frame() });
}

Game.prototype.update = function(dt)
{
	if (this.shake > 0)
		this.shake -= dt;

	this.duckEmitter.update(dt);

	var c = this.duckPiecesCount;

	for (var i = 0; i < c; i++)
	{
		var piece = this.duckPieces[i];

		piece.update(dt);

		if (!piece.active)
		{
			this.duckPieces[i] = this.duckPieces[c - 1];
			this.duckPieces[c - 1] = piece;
			c--;
			i--;
		}
	}

	this.duckPiecesCount = c;
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

	var c = this.duckPiecesCount;

	for (var i = 0; i < c; i++)
		this.duckPieces[i].draw(context, percent);

	var ducks = this.duckEmitter.elements;
	var nDucks = this.duckEmitter.count;

	for (var i = 0; i < nDucks; i++)
		ducks[i].draw(context, percent);

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

	if (this.duckEmitter)
		this.duckEmitter.emissionRate = this.width / 100;
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

		this.shake = 0.4;

		var ducks = this.duckEmitter.elements;
		var nDucks = this.duckEmitter.count;

		for (var i = nDucks - 1; i >= 0; i--)
		{
			if (ducks[i].collides(x, y, this.framePercent))
			{
				var j = 0;
				var c = this.duckPiecesCount;
				var L = this.duckPieces.length;

				var head = null;
				var body = null;

				if (c < L)
				{
					head = this.duckPieces[c++];
				}
				else
				{
					var furthest = 0;
					var dist = -1;

					for (var j = 0; j < L; j++)
					{
						var pos = this.duckPieces[j].blood.position;
						var d = (pos.x - x) * (pos.x - x) + (pos.y - y) * (pos.y - y);

						if (d > dist)
						{
							furthest = j;
							dist = d;
						}
					}

					head = this.duckPieces[furthest];
				}

				if (c < L)
				{
					body = this.duckPieces[c++];
				}
				else
				{
					var furthest = 0;
					var dist = -1;

					for (var j = 0; j < L; j++)
					{
						if (this.duckPieces[j] === head)
							continue;

						var pos = this.duckPieces[j].blood.position;
						var d = (pos.x - x) * (pos.x - x) + (pos.y - y) * (pos.y - y);

						if (d > dist)
						{
							furthest = j;
							dist = d;
						}
					}

					body = this.duckPieces[furthest];
				}

				this.duckPiecesCount = c;

				ducks[i].split(head, body);
				ducks[i].gone = true;

				return;
			}
		}

		for (var i = this.duckPiecesCount - 1; i >= 0; i--)
		{
			var piece = this.duckPieces[i];

			if (!piece.exploding && piece.collides(x, y, this.framePercent))
			{
				piece.explode();
				return;
			}
		}
	}
}

Game.prototype.keyboard = function(key, pressed)
{
}

//******************************************************************************
// Entity
//******************************************************************************

function Entity()
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

Entity.prototype.setPosition = function(x, y, z)
{
	this.prevpos.x = this.position.x = x;
	this.prevpos.y = this.position.y = y;
	this.prevpos.z = this.position.z = z;
}

Entity.prototype.setVelocity = function(x, y, z)
{
	this.velocity.x = x;
	this.velocity.y = y;
	this.velocity.z = z;
}

Entity.prototype.setAngle = function(angle)
{
	this.prevang = this.angle = angle;
}

//******************************************************************************
// Emitter
//******************************************************************************

function Emitter(owner, callbacks)
{
	this.owner = owner;
	this.elements = [];
	this.count = 0;
	this.emissionRate = 0;
	this.emitCounter = 0;
	this.elapsed = 0;
	this.active = true;

	// callbacks
	this.createElement = callbacks.create;
	this.updateElement = callbacks.update;
	this.emitElement   = callbacks.emit;
	this.deadElement   = callbacks.dead;
}

Emitter.prototype.init = function(rate, size)
{
	this.emissionRate = rate;
	this.elements.length = size;

	for (var i = 0; i < size; i++)
		this.elements[i] = this.createElement(this.owner);
}

Emitter.prototype.reset = function()
{
	this.count = 0;
	this.emitCounter = 0;
	this.elapsed = 0;
	this.active = true;
}

Emitter.prototype.update = function(dt)
{
	this.elapsed += dt;

	var max = this.elements.length;
	var rate = 1.0 / this.emissionRate;

	this.emitCounter += dt;

	if (this.active)
	{
		while (this.count < max && this.emitCounter > rate)
		{
			this.emitCounter -= rate;
			this.emitElement(this.owner, this.elements[this.count++]);
		}
	}

	for (var i = 0; i < this.count; i++)
	{
		var element = this.elements[i];

		this.updateElement(this.owner, element, dt);

		if (this.deadElement(this.owner, element))
		{
			this.elements[i] = this.elements[this.count - 1];
			this.elements[this.count - 1] = element;
			this.count--;
			i--;
		}
	}
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

	this.setPosition(rand(0, game.width), -60, 0);
	this.setVelocity(vel * Math.cos(dir), vel * -Math.sin(dir), 0);
	this.setAngle(rand(0, 360) * (Math.PI / 180));

	this.angvel = rand(-720, 720) * (Math.PI / 180);
	this.gone = false;
}

Duck.prototype.collides = function(x, y, framePercent)
{
	var deltax = lerp(this.prevpos.x, this.position.x, framePercent) - x;
	var deltay = lerp(this.prevpos.y, this.position.y, framePercent) - y;

	if (deltax * deltax + deltay * deltay < 25*25)
		return true;

	return false;
}

Duck.prototype.withinBounds = function()
{
	return this.position.y <= game.height + 120 && this.position.x >= -120 && this.position.x <= game.width + 120;
}

Duck.prototype.split = function(head, body)
{
	var s = -Math.sin(this.angle);
	var c =  Math.cos(this.angle);

	// head

	var offsetx = 3*c - (-9)*s;
	var offsety = 3*s + (-9)*c;

	var dirh = this.angle + deg(90) + deg(rand(-10, 10));
	var speedh = rand(100, 200);

	var xh = this.position.x + offsetx;
	var yh = this.position.y + offsety;
	var ah = this.angle - deg(90);
	var vah = this.angvel;
	var vxh = this.velocity.x + speedh *  Math.cos(dirh);
	var vyh = this.velocity.y + speedh * -Math.sin(dirh);
	var vzh = -rand(0, 10) / 20;

	// body

	var offsetx = 5*c - 12*s;
	var offsety = 5*s + 12*c;

	var dirb = this.angle - deg(90) + deg(rand(-10, 10));
	var speedb = rand(100, 200);

	var xb = this.position.x + offsetx;
	var yb = this.position.y + offsety;
	var ab = this.angle + deg(90);
	var vab = -this.angvel;
	var vxb = this.velocity.x + speedb *  Math.cos(dirb);
	var vyb = this.velocity.y + speedb * -Math.sin(dirb);
	var vzb = -rand(0, 10) / 20;

	head.reset(game.images["duckhead"], 25, 30, xh, yh, ah, vxh, vyh, 0, vah);
	body.reset(game.images["duckbody"], 13, 30, xb, yb, ab, vxb, vyb, 0, vab);
}

Duck.prototype.update = function(dt)
{
	if (this.withinBounds())
		Entity.prototype.update.call(this, dt);
	else
		this.gone = true;
}

Duck.prototype.draw = function(context, percent)
{
	var x = lerp(this.prevpos.x, this.position.x, percent);
	var y = lerp(this.prevpos.y, this.position.y, percent);
	var a = lerp(this.prevang, this.angle, percent);

	context.save();
	context.translate(x, y);
	context.rotate(-a);
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
// Blood
//******************************************************************************

Blood.prototype = new Entity();

function Blood()
{
	Entity.call(this);

	this.particleImage = game.images["blood"];
	this.explosionMode = false;

	this.emitter = new Emitter(this, {
		create: function(owner)              { return new Particle();    },
		update: function(owner, element, dt) { element.update(dt);       },
		emit:   function(owner, element)     { owner.emit(element);      },
		dead:   function(owner, element)     { return element.life <= 0; }
	});

	this.emitter.init(200, 1000);
}

Blood.prototype.emit = function(particle)
{
	if (this.explosionMode)
	{
		var a = deg(rand(0, 360));
		var r = rand(0, 10);

		particle.reset(r * Math.cos(a), r * -Math.sin(a), 0.7, a, 150);
	}
	else
	{
		var dirAngle = this.angle - 0.5 * Math.PI;
		var dirMagnitude = rand(-1, 1);

		var x = dirMagnitude * Math.cos(dirAngle);
		var y = dirMagnitude * -Math.sin(dirAngle);
		var life = 0.8;
		var angle = this.angle + rand(-10, 10) * Math.PI / 180;
		var speed = rand(200, 230);

		particle.reset(x, y, life, angle, speed);
	}
}

Blood.prototype.update = function(dt)
{
	Entity.prototype.update.call(this, dt);
	this.emitter.update(dt);

	if (this.explosionMode && this.emitter.elapsed > 0.2)
		this.emitter.active = false;
}

Blood.prototype.draw = function(context, percent)
{
	var x = lerp(this.prevpos.x, this.position.x, percent);
	var y = lerp(this.prevpos.y, this.position.y, percent);
	var z = lerp(this.prevpos.z, this.position.z, percent);
	var s = Math.exp(z);

	context.save();
	context.translate(x, y);
	context.scale(s, s);

	context.globalCompositeOperation = "lighter";

	for (var i = 0; i < this.emitter.count; i++)
	{
		var particle = this.emitter.elements[i];

		var x = lerp(particle.prevpos.x, particle.position.x, percent);
		var y = lerp(particle.prevpos.y, particle.position.y, percent);
		var life = lerp(particle.prevlife, particle.life, percent);

		context.globalAlpha = 1 - Math.log((1 - life / 0.6) * 2.71827);
		context.drawImage(this.particleImage, x - this.particleImage.width / 2, y - this.particleImage.height / 2);
	}

	context.restore();
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
	this.setPosition(x, y, 0);
	this.setVelocity(speed * Math.cos(angle), speed * -Math.sin(angle));
	this.prevlife = this.life = life;
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

function DuckPiece()
{
	this.image = null;
	this.center = { x: 0, y: 0 };
	this.blood = new Blood();
	this.active = false;
	this.exploding = false;
}

DuckPiece.prototype.reset = function(image, cx, cy, x, y, angle, vx, vy, vz, va)
{
	this.active = true;
	this.exploding = false;
	this.image = image;
	this.center.x = cx;
	this.center.y = cy;
	this.blood.angvel = va;
	this.blood.setAngle(angle);
	this.blood.setPosition(x, y, 0);
	this.blood.setVelocity(vx, vy, vz);
	this.blood.emitter.reset();
	this.blood.emitter.emissionRate = 200;
	this.blood.explosionMode = false;
}

DuckPiece.prototype.explode = function()
{
	this.exploding = true;
	this.blood.explosionMode = true;
	this.blood.emitter.reset();
	this.blood.emitter.emissionRate = 1000;
}

DuckPiece.prototype.collides = function(x, y, framePercent)
{
	var blood = this.blood;

	var deltax = lerp(blood.prevpos.x, blood.position.x, framePercent) - x;
	var deltay = lerp(blood.prevpos.y, blood.position.y, framePercent) - y;

	if (deltax * deltax + deltay * deltay < 25*25)
		return true;

	return false;
}

DuckPiece.prototype.update = function(dt)
{
	var blood = this.blood;

	if (this.active)
		blood.update(dt);

	if (blood.position.y < -120 || blood.position.y > game.height + 120 || blood.position.x < -120 || blood.position.x > game.width + 120 || blood.position.z <= -2)
		this.active = false;
	else if (this.exploding)
		this.active = blood.emitter.count > 0;
}

DuckPiece.prototype.draw = function(context, percent)
{
	var blood = this.blood;

	// draw blood

	var partctx = game.particlebuffer.context;
	partctx.clearRect(0, 0, game.width, game.height);
	blood.draw(partctx, percent);

	context.save();
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.drawImage(game.particlebuffer.canvas, 0, 0);
	context.restore();

	// draw duck piece

	if (!this.exploding)
	{
		var x = lerp(blood.prevpos.x, blood.position.x, percent);
		var y = lerp(blood.prevpos.y, blood.position.y, percent);
		var z = lerp(blood.prevpos.z, blood.position.z, percent);
		var a = lerp(blood.prevang, blood.angle, percent);
		var s = Math.exp(z);

		context.save();
		context.translate(x, y);
		context.rotate(-a);
		context.scale(s, s);
		context.drawImage(this.image, -this.center.x, -this.center.y);
		context.restore();
	}
}

//******************************************************************************
// Global helpers
//******************************************************************************

function deg(value)
{
	return value * Math.PI / 180;
}

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
