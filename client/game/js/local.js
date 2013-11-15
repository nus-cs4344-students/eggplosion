//This javascript contain codes for controlling the player movement and ability to place a bomb.


define([
    "jquery", "underscore", "backbone",
],function($, _, Backbone, core) {

    // consts for detecting keyboard key
    var LEFT = 37;
    var UP = 38;
    var RIGHT = 39;
    var DOWN = 40;
    var SPACE = 32;
  
   	
    var PLAYER_MOVE_SPEED = 5; // squares per second
    var PLAYER_MAX_SPEED = 0.9;

    var keymap = {}; // it's ok to be global

    var inChat = false;

    LocalManager = Backbone.Model.extend({
        defaults: {
        },
	

        initialize: function(opt) {
            this.$document = opt.document;
            this.world = opt.world;
            this.network = opt.network;

            this.me = this.world.player;

            this.$console = $("#console");
            this.$chatbox = $("#chatbox");
            this.$chatbox.keyup(_.throttle(_.bind(function() {
                if (this.$chatbox.val().length>0)
                this.world.player.sendMessage(this.$chatbox.val()+"...");
            }, this),50));

            // keyboard handlers
            this.$document.keydown($.proxy(this.onKeyDown, this));
            this.$document.keyup($.proxy(this.onKeyUp, this));
        },
	
	//handle scenario where user press the down key
        onKeyDown: function(e) {
            if (!inChat) {
                keymap[e.keyCode] = true;

                e.stopImmediatePropagation();
                e.preventDefault();
            }

            if (e.keyCode == 13) {
                if (this.$chatbox.is(":focus")) {
                    this.$chatbox.blur();
                    this.$console.animate({
                        'height': 'toggle',
                        'margin-bottom': 'toggle'
                    }, 200);
                    this.network.sendChat(this.$chatbox.val());
                    this.$chatbox.val("");
                    inChat = false;
                } else {
                    this.$console.animate({
                        'height': 'toggle',
                        'margin-bottom': 'toggle'
                    }, 200);
                    this.$chatbox.focus();
                    inChat = true;
                }
            }
        },
	
	//handle scenario where user press the up key
        onKeyUp: function(e) {
            keymap[e.keyCode] = false;
        },
	
	//handle events where the various key are being pressed
        update: function(delta) {
            if (this.me.get('dead')) return;

            var speed = delta * PLAYER_MOVE_SPEED;
            if (speed > PLAYER_MAX_SPEED) speed = PLAYER_MAX_SPEED;
            var dx = 0;

            var dy = 0;
            // handle input
            if (keymap[LEFT])   dx-=speed;
            if (keymap[RIGHT])  dx+=speed;
            if (keymap[UP])     dy-=speed;
            if (keymap[DOWN])   dy+=speed;
			
			var tilted = false;
			// Listen for the deviceorientation event and handle the raw data
			window.addEventListener('deviceorientation', function(eventData) {
				// gamma is the left-to-right tilt in degrees, where right is positive
				var tiltLR = Math.round(eventData.gamma);

				// beta is the front-to-back tilt in degrees, where front is positive
				var tiltFB = Math.round(eventData.beta);
			
				if(tiltLR > 10) {dx+=speed; tilted = true;}
				if(tiltLR < -10) {dx-=speed; tilted = true;}
				if(tiltFB > 10) {dy+=speed; tilted = true;}
				if(tiltFB < -10) {dy-=speed; tilted = true;}
				
			}, false);
			
            var moving = keymap[LEFT] || keymap[RIGHT] || keymap[UP] || keymap[DOWN] || tilted;

            if (moving)
                this.requestMove(dx, dy);
			
            if (keymap[SPACE])
                this.tryPlaceBomb();

            this.me.set('moving', moving===true);

            var cx = Math.floor(this.me.get('x'));
            var cy = Math.floor(this.me.get('y'));

            var flame = this.world.map.getFlame(cx, cy);
            if (flame!=null) {
                this.me.die(flame);
                play('die');
            }
        },
	
	//try to place the bomb if it allows
        tryPlaceBomb: function() {
            var x = Math.floor(this.me.get('x'));
            var y = Math.floor(this.me.get('y'));
            if (this.world.map.getBomb(x, y) == null)
                this.world.placeBomb(x, y);
        },
	
	//move by delta x and y position if conditions allow
        requestMove: function(dx, dy) {
            var x = this.me.get('x');
            var y = this.me.get('y');

            var PLAYER_GIRTH = 0.35;

            var gx = Math.floor(x);
            var gy = Math.floor(y);
            var gtx = Math.floor(x + dx + util.dir(dx)*PLAYER_GIRTH );
            var gty = Math.floor(y + dy + util.dir(dy)*PLAYER_GIRTH );

            // can it move on X axis?
            if (!this.world.map.canMove( gx, gy, gtx, gy ) )
                dx = 0; // no x axis moving
            else {
                gx = Math.floor(x + dx);
            }

            if (!this.world.map.canMove( gx, gy, gx, gty ) )
                dy = 0; // no y axis moving

            this.me.deltaMove(dx, dy);
        }


    });

    util = {};
    util.dir = function(x) { return x>0 ? 1 : x<0 ? -1 : 0 }
    util.ease = function(x, y, c) {
        return x*(1-c) + y*c;
    }


});
