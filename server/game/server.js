//This javascript handle two components: user connection to the lobby and to the game.


TILE_EMPTY = 0;
TILE_BRICK = 1;
TILE_SOLID = 2;


SPAWNING_TIME = 5000;


_ = require('underscore')._;
Backbone = require('backbone');

var redis;

require('./map.js');
require('./game.js');
require('./model.js');
require("./player.js");


var Server = Backbone.Model.extend({

	
    initialize: function(opt) {
        var io = opt.io;
        redis = opt.redis;
	this.games={};
	this.endpoints={};
	this.gameIDCounter=0;	
        global.counters.players = 0;
        global.counters.mapfill = 0;
	this.serverIO=opt.io;
        if (redis) {
            redis.incr("counters.restarts");
            redis.set("stats.last-start-time", (new Date()).getTime());
        }
//test
        io.set('log level', 1);

        var game = new Game({ redis: redis });
	game.gameID=this.gameIDCounter;
       
	
	this.games[this.gameIDCounter]=game;
	

        var endpoint = io.of('/game'+this.gameIDCounter);
        endpoint.on('connection', _.bind(this.connection, this));
        game.endpoint = endpoint;
	 this.endpoints[this.gameIDCounter]=endpoint;

	
	 game.bombs.on('remove', _.bind(function(b) {
		 
	this.endpoints[game.gameID].emit('bomb-boomed', {
            x: b.get('x'),
            y: b.get('y'),
            strength: b.get('strength')
        });
		 
	 },this));
	
        game.on('score-changes', _.debounce(this.notifyScoreUpdates, 50), this);
	 
        this.lobby = io.of('/lobby');
        this.lobby.on('connection', _.bind(this.lobbyConnection, this));
	 this.gameIDCounter++;
    },

    //when there is a connection to the server lobby's site
   //it will get all the game session to see if there is any session free
   //if there is not, it will create a new game session
   //When it receive a request to send game sessions, it will send all the game session to the user
    lobbyConnection: function(socket) {
	
	    var allFull=1;
	    try{
		    _.each(this.games,function(game)
		    {
			    if (game.totalPlayer<2)
			   {
				   throw new Error("break");
			   }
			    
		    });
	    }catch(e)
	    {
		    if (e.message=="break")
		    {
			allFull=0;    
		    }
	    }
	
	//all game session are full, create new session
	if (allFull==1)
	{	
		var game = new Game({ redis: redis });
		game.gameID=this.gameIDCounter;
	
		
		this.games[this.gameIDCounter]=game;
		 var endpoint = this.serverIO.of('/game'+this.gameIDCounter);
		endpoint.on('connection', _.bind(this.connection, this));
		game.endpoint = endpoint;
		this.endpoints[this.gameIDCounter]=endpoint;
		
		 game.bombs.on('remove', _.bind(function(b) {
		
		 this.endpoints[game.gameID].emit('bomb-boomed', 
			 {
				x: b.get('x'),
				y: b.get('y'),
				strength: b.get('strength')
			});
		 
	 },this));
	 
		game.on('score-changes', _.debounce(this.notifyScoreUpdates, 50), this);
		this.gameIDCounter++;
		
		
	}
	
	//send all game session to user    
        socket.on('list-games', _.bind(function(d) {
		var count=0;
		var allGames={};
	  _.each(this.games,function(game) {
		
		if (game.totalPlayer<2)
		  {
			  var game1= {
				   type: "free",
				  count: game.totalPlayer,
				   gameID:game.gameID
				};
			allGames[count]=game1;
			count++;
		 }	  
		  
	});
		
	 socket.emit("list-games",allGames);
		
         
        }, this));

    },
    
    //when the user make a connection to the actual game    
    connection: function(socket) {
        global.counters.players++;

        // generate id
        var playerId = this.games[0].generatePlayerId();

        // send game info
        socket.emit('game-info', {
            game:"demo1",
            ver: 1,
            your_id: playerId
        });

        // wait for join
        socket.on('join', _.bind(function(d) {
            var name = d.name;

            if (redis)
                redis.incr("counters.joined-players");

            // create new player
            var me = new Player({
                id: playerId,
                name: d.name,
                character: d.character,
               
            });
            this.games[d.gameID].playersById[playerId] = me;
	   this.games[d.gameID].totalPlayer++;
           
	    // setup a player controller
            var ctrl = new PlayerController({
                id: playerId,
                player: me,
                game: this.games[d.gameID], // TODO joined game
                socket: socket,
                endpoint: this.endpoints[d.gameID]
            });
            this.games[d.gameID].ctrlsById[playerId] = ctrl;

            ctrl.on('disconnect', _.bind(function() {
                delete this.games[d.gameID].playersById[playerId];
                delete this.games[d.gameID].ctrlsById[playerId];
		this.games[d.gameID].totalPlayer--;

                global.counters.players--;
            }, this));

            console.log("+ " + name + " joined the game " );

            // notify everyone about my join
            socket.broadcast.emit('player-joined', me.getInitialInfo());

            // update me about the current game state
            ctrl.notifyGameState();

        }, this));

    },

  //notify users about his latest score
    notifyScoreUpdates: function(gameID) {
        var scoring = {};
		
	
        _.each(this.games[gameID].playersById, function(p,id) {
            scoring[id] = p.get('score');
        });

        this.endpoints[gameID].emit('score-updates', scoring);
    }


});



module.exports = Server;
