//This file code will handle all the states about the player

(function() {

//data structure and function of the player
    Player = Backbone.Model.extend({

        defaults: {
            alive: false,
            spawnAt: 0,
            score: 0
        },

        initialize: function() {
            this.id = this.get('id');
        },

        setUpdate: function(d) {
            this.set('x', d.x);
            this.set('y', d.y);
            this.set('o', d.o);
            this.set('m', d.m);
        },

        getUpdate: function() {
            return {
                id: this.get('id'),
                x: this.get('x'),
                y: this.get('y'),
                o: this.get('o'),
                m: this.get('m')
            };
        },

        getInitialInfo: function() {
            return {
                id: this.get('id'),
                name: this.get('name'),
                character: this.get('character'),
                score: this.get('score'),

            }
        },

        die: function() {
            this.set('alive', false);
        }
    });


    PlayerController = Backbone.Model.extend({
	
	//initialize variables and set event handlers
        initialize: function(opt) {
            this.id = opt.id;
            this.me = opt.player;
            this.game = opt.game;
            this.endpoint = opt.endpoint;
            this.socket = opt.socket;

            this.socket.on('update', _.bind(this.onUpdate, this));
            this.socket.on('dead', _.bind(this.onDead, this));
            this.socket.on('disconnect', _.bind(this.onDisconnect, this));
            this.socket.on('put-bomb', _.bind(this.onPlaceBomb, this));
            this.socket.on('chat', _.bind(this.onChat, this));
            this.socket.on('pong', _.bind(this.onPong, this));

            // check for map changes
            this.game.map.on('notify', function() {
                this.socket.emit('map', this.game.map.getMap());
            }, this);

            this.pingTimer = setInterval(_.bind(this.ping, this), 2000);

           
        },
	
	
        ping: function() {
            var info = { now: (new Date()).getTime(), lags: {} };
            _.each(this.game.playersById, function(p,k) {
                info.lags[k] = p.lag;
            });

            this.socket.emit("laginfo", info );
        },

        onPong: function(d) {
            this.me.lag = ((new Date()).getTime() - d.t) / 2;
        },
	
	//update a player state and broad to all other players
	onUpdate: function(d) {
            this.me.setUpdate(d);
            // update everyone else about my update
            this.socket.broadcast.volatile.emit('player-update', this.me.getUpdate());
        },
	
	//set when to spawn and send out information to client that he is dying
        onDead: function(d) {
            this.me.die();

            this.game.scoreKill(d.id, d.flameOwner);

            this.me.set('spawnAt', this.game.lastTick + SPAWNING_TIME);
            // notify everyone else
            this.endpoint.emit('player-dying', d);
        },
	
	//broadcast to everyone that player have disconnected
	//and trigger the disconenct event 
        onDisconnect: function() {
            clearInterval(this.pingTimer);
            console.log("- " + this.me.get('name') + " disconnected");
            this.socket.broadcast.emit('player-disconnected', {id: this.id} );

            this.trigger("disconnect");
        },

	//check if a bomb can be placed.
	//If it can be placed, then broadcast to all player
        onPlaceBomb: function(d) {

            // can place bomb there?
            if (!this.game.bombs.any(function(b) { return b.get('x') == d.x && b.get('y') == d.y; }))
            {
                // no bomb here
                this.game.bombs.add(new Bomb({x: d.x, y: d.y, owner: this.id}));
                // notify everyone
                this.endpoint.emit('bomb-placed', {x: d.x, y: d.y, owner: this.id});
            } else {
                console.log('A bomb at ' + d.x + ", " + d.y + " already exists!");
            }
        },
	
	//send chat message to player
        onChat: function(d) {
            console.log('> ' + this.me.get('name') + ": " + d.chat, 'chat');
            this.endpoint.emit('chat', d);
        },

	//determine where to spawn for player and send that information to him
        spawnPlayer: function() {
            this.me.set('alive', true);
            var loc = this.game.map.getValidSpawnLocation();
            console.log("  . Spawn " + this.me.get('name') + " at " + loc.x+","+loc.y);
            this.endpoint.emit('player-spawned', {
                id: this.id,
                x: loc.x,
                y: loc.y
            });
        },
	
	//send game state to player
        notifyGameState: function(d) {
            // send map
            this.socket.emit('map', this.game.map.getMap());

            // joined players
            _.each(this.game.playersById, function(p) {
                if (p == this.me) return;
                this.socket.emit('player-joined', p.getInitialInfo());

                if (p.get('alive')) {
                    this.socket.emit('player-spawned', {id: p.get('id'), x: p.get('x'), y: p.get('y')});
                }
            }, this);

            // placed bombs
            // TODO
        },


    });


})();
