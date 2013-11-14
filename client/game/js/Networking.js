define([
    "jquery", "underscore", "backbone",
],function($, _, Backbone, core) {



    Networking = Backbone.Model.extend({
	
	//initialize network 
        initialize: function(opt) {
            this.id = -1;

            this.peers = {};

            this.world = opt.world;
	   this.gameID=opt.gameID;
            this.world.player.on('change', this.playerChange, this);
            this.world.player.on('die', this.playerDie, this);

            this.world.placeBombs.on('add', this.requestPlaceBomb, this);

            //this.socket = io.connect(window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/' + opt.game);
            this.socket = io.connect('http://localhost:8080/' + opt.game);
	    
	    //following are event handler..so that if it activate various methods based on message received
	   //from server
            this.socket.on('disconnect', $.proxy(this.onDisconnect, this));

            this.socket.on('game-info', $.proxy(this.onGameJoin, this));
            this.socket.on('map', $.proxy(this.onMapUpdate, this));
            this.socket.on('player-joined', $.proxy(this.onPlayerJoined, this));
            this.socket.on('player-spawned', $.proxy(this.onPlayerSpawned, this));
            this.socket.on('player-update', $.proxy(this.onPlayerUpdated, this));
            this.socket.on('player-dying', $.proxy(this.onPlayerDying, this));
            this.socket.on('player-disconnected', $.proxy(this.onPlayerDisconnected, this));
            this.socket.on('chat', $.proxy(this.onChat, this));
            this.socket.on('laginfo', $.proxy(this.onPing, this));

            this.socket.on('score-updates', $.proxy(this.onScoreUpdates, this));
            this.socket.on('friend-scores', $.proxy(this.onFriendScoreUpdates, this));

            this.socket.on('bomb-placed', $.proxy(this.onBombPlaced, this));
            this.socket.on('bomb-boomed', $.proxy(this.onBombBoomed, this));

            this.socket.on('break-tiles', $.proxy(this.onTilesBroke, this));
        },
	
	//remove everyone when it receive disconnect message
        onDisconnect: function() {
            $('#waitserver').show();

            _.each(this.peers, _.bind(function(p) {
                this.world.players.remove(p);
            }, this));
            this.peers = {};
        },

	//send join request to server
        onGameJoin: function(d) {
            $('#waitserver').hide();

            this.id = d.your_id;
            console.log("Welcome to game " + d.game + " (my id = " + this.id + ")");
		
            this.socket.emit('join', {
                id: this.id,
                name: this.world.player.get('name'),
                character: this.world.player.get('character'),
		gameID:this.gameID
            });

            this.world.player.id = this.id;

            // mark ourself in the peer list
            this.peers[this.id] = this.world.player;
        },

	//update map
        onMapUpdate: function(d) {
            this.world.map.set({
                x: d.x,
                y: d.y,
                width: d.w,
                height: d.h,
                map: d.map,
                initialized: true
            });
            this.world.map.setDirty();
            console.log("full map update");
        },

	//handle event that when new player join
        onPlayerJoined: function(d) {
            d.name = _.escape(d.name);
            info("<u>" + d.name + "</u> joined");
            var c = new Character({
                id: d.id,
                name: d.name,
                character: d.character,
                score: d.score,
               
            });
            console.log(d.name + " #" + d.id + " joined", c);
            this.world.players.add(c);
            this.peers[d.id] = c;
        },
	
	//handle event that when a character spawned
        onPlayerSpawned: function(d) {
            var c = this.peers[d.id];
            if (!c) {
                // we don't know this guy
                console.log("#" + d.id + " spawned");
                return;
            }
            console.log(c.get('name') + " spawned");
            c.set({
                x: d.x,
                y: d.y,
                dead: false
            });

			if (d.id == this.id) {
                c.trigger('spawn');
                this.world.map.setDirty();
                // FIXME
//				var cv = _.find(this.world.playerViews, function(v) { return v.model == c });
//				cv.showSpawn();
			}

            play('spawn');
        },

	//handle event that when a character disconnect
        onPlayerDisconnected: function(d) {
            var c = this.peers[d.id];
            if (!c) return; // we don't know this guy
            info("<u>" + c.get('name') + "</u> disconnected");
            console.log(c.get('name') + " disconnected");

            this.world.players.remove(c);
            delete this.peers[d.id];

            play('disconnect');
        },

        onPlayerUpdated: function(d) {
            var c = this.peers[d.id];
            if (!c) {
                console.log("Update from unknown #"+ d.id);
                return;
            }

            c.set({
                x: d.x,
                y: d.y,
                orient: d.o,
                moving: d.m
            });
        },
	
	//handle event when a player is dying
        onPlayerDying: function(d) {
            var c = this.peers[d.id];
            if (!c) {
                console.log("Update from unknown #"+ d.id);
                return;
            }
            console.log("Dying", d);
            if (d.id != this.id)
                c.die();

            if (d.id == d.flameOwner)
                suicide(c.get('name'));
            else {
                var killer = this.peers[d.flameOwner];
                if (killer)
                    kill(c.get('name'), killer.get('name'));

                if (d.flameOwner == this.id)
                    play("win/" + Math.floor(Math.random()*10));
            }
        },

        playerChange: function(player) {
            this.sendPlayerChange(player);
        },

        playerDie: function(flame) {
            var flameOwner = -1;
            if (flame) {
                flameOwner = flame.get('owner');
                var oc = this.peers[ flameOwner ];
                console.log("Killed by: ", oc.get('name'));
            }

            this.socket.emit('dead', {
                id: this.id,
                flameOwner: flameOwner,
		gameID:this.gameID
            });
        },
	
	//send message to server that a bomb is place
        requestPlaceBomb: function(b) {
            this.socket.emit('put-bomb', {x: b.get('x'), y: b.get('y'),gameID:this.gameID});
            this.world.placeBombs.remove(b);
        },

	//send message to server new update about player
        sendPlayerChange: _.throttle(function(player) {
            this.socket.emit('update', {
                id: this.id,
                x: Math.round( player.get('x') * 1000 ) / 1000,
                y: Math.round( player.get('y') * 1000 ) / 1000,
                o: player.get('orient'),
                m: player.get('moving'),
		gameID:this.gameID
            });
        }, 25),
	
	//display chat message
        onChat: function(d) {
            d.chat = _.escape(d.chat);
            var c = this.peers[d.id];
            var cls = "chat";
            if (d.id == this.id) cls = "mychat";
            if (!c)
                chat('#' + d.id + '> ' + d.chat, cls);
            else
                chat(c.get('name') + '> ' + d.chat, cls);

            play('chat');
        },
	
	//send chat message
        sendChat: function(chat) {
            chat = chat.trim();
            if (chat.length==0) return;
            this.socket.emit('chat', {
                id: this.id,
                chat: chat
            });
        },
	
	//handle event that when a bomb is placed
        onBombPlaced: function(d) {
            this.world.bombs.add(new Bomb({x:d.x, y:d.y, owner:d.owner}));
        },
	
	//handle event that when a bomb goes off
        onBombBoomed: function(d) {
            var b = this.world.bombs.find(function(b) {
                return b.get('x') == d.x && b.get('y') == d.y
            });

            // locate bomb
            this.world.explodeBomb(b, d.strength);
        },
	
	//handle event that when a tile is broken (by explosion)
        onTilesBroke: function(ds) {
            _.each(ds, _.bind(function(d) {
                this.world.map.setTile(d.x, d.y, TILE_EMPTY);
                this.world.map.setDirty(d.x, d.y);
                this.world.breakings.add( new BreakingTile({x:d.x, y:d.y}) );
            }, this));
        },

        onPing: function(d) {
            _.each(d.lags, _.bind(function(lag, id) {
                var p = this.peers[id];
                if (p) p.set('lag', lag);
            }, this));

            this.socket.emit('pong', {t: d.now,gameID:this.gameID} );
            this.world.updateScoring(false);
        },

	//update new scores
        onScoreUpdates: function(d) {
            _.each(d, _.bind(function(score, id) {
                var p = this.peers[id];
                if (p) p.set('score', score);
            }, this));

            this.world.updateScoring(true);
        },

	//update friends score
        onFriendScoreUpdates: function(d) {
            var self = this;
            var mates =_.map(d.ids, function(id) { return self.peers[id] });

            this.world.updateFriendScoring(mates, d.scores);
        }

    });



});
