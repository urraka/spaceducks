//******************************************************************************
// main
//******************************************************************************

game = null;

function main()
{
	game = new Game();
	game.start();
}

function frame() { game.frame(); }

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

	this.resize();

	// loop timing stuff

	this.dt = 30;
	this.time = 0;
	this.accumulator = 0;
	this.framePercent = 0;

	// sound effects

	this.soundeffects = {};
	this.soundeffects["cuak"] = new SoundEffect(document.getElementById("cuak"));
	this.soundeffects["splat"] = new SoundEffect(document.getElementById("splat"));
	this.soundeffects["rifle"] = new SoundEffect(document.getElementById("rifle"), 10);

	// image resources

	this.images = {};
	this.images["duck"] = document.getElementById("duck");
	this.images["duckhead"] = document.getElementById("duckhead");
	this.images["duckbody"] = document.getElementById("duckbody");
	this.images["blood"] = Particle.generateImage(255, 0, 0, 3);
	this.images["star"] = Star.generateImage();

	// game stuff

	this.background = new SpaceBackground();
	this.background.generate(this.width, this.height);

	this.shake = 0;
	this.shakeOffset = { x: 0, y: 0 };
	this.cuak = 1;

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

	this.draw(this.backbuffer.context, this.accumulator / dt);
	this.frontbuffer.context.drawImage(this.backbuffer.canvas, 0, 0);

	requestAnimationFrame(frame);
}

Game.prototype.update = function(dt)
{
	if (this.shake > 0)
		this.shake -= dt;

	this.background.update(dt);
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

	this.cuak -= dt;

	if (this.cuak <= 0)
	{
		this.soundeffects["cuak"].play(rand(50, 100) / 100);
		this.cuak = rand(2, 10) / 10;
	}
}

Game.prototype.draw = function(context, percent)
{
	this.framePercent = percent;

	var partctx = this.particlebuffer.context;
	partctx.setTransform(1, 0, 0, 1, 0, 0); // identity

	context.save();

	this.background.draw(context, percent);

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

	if (this.background)
		this.background.generate(this.width, this.height);

	if (this.duckEmitter)
		this.duckEmitter.emissionRate = this.width / 100;
}

Game.prototype.shoot = function(x, y)
{
	this.soundeffects["rifle"].play();

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
		var duck = ducks[i];

		var duckx = lerp(duck.prevpos.x, duck.position.x, this.framePercent);
		var ducky = lerp(duck.prevpos.y, duck.position.y, this.framePercent);

		if (hittest(duckx, ducky, 25, x, y))
		{
			var c = this.duckPiecesCount;
			var L = this.duckPieces.length;

			var head = null;
			var body = null;

			// this will take 2 pieces from duckPieces (head and body)
			// if all duckPieces are in use, it will take the ones furthest from mouse position

			for (var type = 0; type < 2; type++)
			{
				var piece = null;

				if (c < L)
				{
					piece = this.duckPieces[c++];
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

					piece = this.duckPieces[furthest];
				}

				if (type === 0)
					head = piece;
				else
					body = piece;
			}

			this.duckPiecesCount = c;

			duck.split(head, body);
			duck.gone = true;

			this.soundeffects["splat"].play(rand(60, 80) / 100);

			return;
		}
	}

	for (var i = this.duckPiecesCount - 1; i >= 0; i--)
	{
		var piece = this.duckPieces[i];

		if (!piece.exploding)
		{
			var piecex = lerp(piece.blood.prevpos.x, piece.blood.position.x, this.framePercent);
			var piecey = lerp(piece.blood.prevpos.y, piece.blood.position.y, this.framePercent);

			if (hittest(piecex, piecey, 20, x, y))
			{
				piece.explode();
				this.soundeffects["splat"].play(rand(60, 80) / 100);
				return;
			}
		}
	}
}

Game.prototype.mouse = function(x, y, pressed)
{
	if (pressed)
		this.shoot(x, y);
}

Game.prototype.keyboard = function(key, pressed) {}

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

Particle.generateImage = function(r, g, b, radius)
{
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");
	var gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);

	canvas.width  = radius * 2;
	canvas.height = radius * 2;

	gradient.addColorStop(0, "rgba(" + r + ", " + g + ", " + b + ", 1)");
	gradient.addColorStop(1, "rgba(" + r + ", " + g + ", " + b + ", 0)");

	context.fillStyle = gradient;
	context.translate(radius, radius);
	context.fillRect(-radius, -radius, 2 * radius, 2 * radius);

	return canvas;
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
// SpaceBackground
//******************************************************************************

function SpaceBackground()
{
	this.image = document.createElement("canvas");
	this.stars = [];
	this.time = 0;
	this.prevtime = 0;
}

SpaceBackground.prototype.generate = function(width, height)
{
	this.image.width  = width;
	this.image.height = height;

	var context = this.image.getContext("2d");
	var imageData = context.createImageData(width, height);

	function rnd(x, y)
	{
		var result = Math.sin(x * 78.233 + y * 12.9898) * 43758.5453;
		return result - Math.floor(result);
	}

	var kstar = 0.000015;

	this.stars.length = 0;

	for (var y = 0; y < height; y++)
	{
		for (var x = 0; x < width; x++)
		{
			var i = y * width * 4 + x * 4;

			var n = rnd(x + 5000, y + 50);
			var intensity1 = Math.pow(n, 50);
			var intensity2 = Math.pow(n, 200);

			imageData.data[i + 0] = intensity1 * 50 + intensity2 * 100;
			imageData.data[i + 1] = intensity1 * 50 + intensity2 * 100;
			imageData.data[i + 2] = intensity1 * 50 + intensity2 * 100;
			imageData.data[i + 3] = 255;

			if (n < kstar)
			{
				n = n / kstar;
				this.stars.push(new Star(x, y, 12 * n + 10, 150 + (1 - n) * 150));
			}
		}
	}

	context.putImageData(imageData, 0, 0);
}

SpaceBackground.prototype.update = function(dt)
{
	this.prevtime = this.time;
	this.time += dt;

	if (this.time >= 360)
		this.time -= 360;
}

SpaceBackground.prototype.draw = function(context, percent)
{
	var time = lerp(this.prevtime, this.time, percent);

	context.drawImage(this.image, 0, 0);

	for (var i = this.stars.length - 1; i >= 0; i--)
		this.stars[i].draw(context, time);
}

//******************************************************************************
// Star
//******************************************************************************

function Star(x, y, size, cyclevel)
{
	this.image = game.images["star"];
	this.position = { x: x, y: y };
	this.scale = size / 64;
	this.cyclevel = cyclevel;
}

Star.prototype.draw = function(context, time)
{
	context.save();
	context.globalAlpha = Math.sin(deg(time * this.cyclevel)) * 0.2 + 0.8;
	context.translate(this.position.x, this.position.y);
	context.scale(this.scale, this.scale);
	context.drawImage(this.image, -32, -32);
	context.restore();
}

Star.generateImage = function()
{
	var size = 64;

	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");
	var imageData = context.createImageData(size, size);

	canvas.width  = size;
	canvas.height = size;

	var k = size * 0.046875;
	var halfsize = 0.5 * size;

	var cx = halfsize;
	var cy = halfsize;

	for (var y = 0; y < size; y++)
	{
		for (var x = 0; x < size; x++)
		{
			var i = y * size * 4 + x * 4;

			var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));

			var salpha = 1 - dist / halfsize;
			var xalpha = x === cx ? halfsize : k / Math.abs(x - cx);
			var yalpha = y === cy ? halfsize : k / Math.abs(y - cy);

			alpha = Math.max(0, Math.min(1, salpha * 0.2 + salpha * xalpha * yalpha));

			imageData.data[i + 0] = 255;
			imageData.data[i + 1] = 255;
			imageData.data[i + 2] = 255;
			imageData.data[i + 3] = 255 * alpha;
		}
	}

	context.putImageData(imageData, 0, 0);

	return canvas;
}

//******************************************************************************
// SoundEffect
//******************************************************************************

function SoundEffect(audio, concurrency)
{
	this.audio = audio;
	this.pool = [];
	this.index = 0;

	concurrency = concurrency || 5;

	for (var i = 0; i < concurrency; i++)
		this.pool.push(audio.cloneNode(true));
}

SoundEffect.prototype.play = function(volume)
{
	if (this.pool[this.index].paused)
	{
		if (typeof volume == "undefined")
			volume = 1;

		this.pool[this.index].volume = volume;
		this.pool[this.index].play();
		this.index = (this.index + 1) % this.pool.length;
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

function hittest(cx, cy, radius, x, y)
{
	return (cx - x) * (cx - x) + (cy - y) * (cy - y) < radius * radius;
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
