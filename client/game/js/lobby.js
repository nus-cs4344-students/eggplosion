//This is the game lobby, get the game sessions from the server and display to User
//When user typed his name and choose his character and game session, it create a game object
//and pass these information to it. The game object will do all other processing work such as 
//connecting to the other server etc
define([
    "jquery", "underscore", "backbone",

    "text!../html/lobby.html",
//    "facebook",

    "Game"
], function($, _, Backbone, tpl) {


    LobbyView = Backbone.View.extend({
	
	//Connect to game server lobby and set event handlers
        initialize: function() {
            this.$el.html(_.template(tpl));

            this.initUsername();
	
           
            this.lobby = io.connect('http://localhost:8080/lobby');

            this.lobby.on('connect', _.bind(this.lobbyConnect, this));
            this.lobby.on('disconnect', _.bind(this.lobbyDisconnect, this));

            this.lobby.on('list-games', _.bind(this.onGamesList, this));


            var frame = 0;
            setInterval(function() {
                frame = (frame+1)%2;
                $("ul.character").attr("class", "character frame"+frame);
            }, 250);

        },

        events: {
            "click .character li": "selectCharacter",
            "click .game-mode": "startGame"
        },

        selectCharacter: function(e) {
            $(".character li.selected").removeClass("selected");
            $(e.currentTarget).addClass("selected");
        },

     
	//Once connected, get the latest game session. Every 2 second do the same thing
        lobbyConnect: function(s) {
            console.log("lobby on!");
            this.listGames();
            this.timer = setInterval(_.bind(this.listGames, this), 2000);
        },
	
	//Stop the polling to the game server to get game session once disconnected
        lobbyDisconnect: function() {
            clearInterval(this.timer);
        },
	
	//send command to server to get game sessions
        listGames: function() {
            this.lobby.emit("list-games");
        },

	//once retrieve game session, display it
        onGamesList: function(games) {
            var gamesList = $('#games-list').empty();

            _.each(games, function(game, key) {
		  
                    var i = $(gameTemplate(game));
		    var x="game"+game.gameID;
		    i.data("game", x);
		    i.data("gameID", game.gameID);
		    
                gamesList.append(i);
            });
        },
	
	//intialize the default charcter
        initUsername: function() {
            var $userid = $('#userid');

            var defaultUser = localStorage.getItem("userName");
            var chr = localStorage.getItem("character");

            if (defaultUser)
                $userid.val(defaultUser);

            if (!chr) {
                var chrs = $(".character-select li");
                var chrix = Math.floor(Math.random() * chrs.length);
                chrs.eq(chrix).addClass("selected");
            } else {
                $(".character-select li ." + chr).parent().addClass("selected");
            }

        },
	
	//get the username, character chosen and the game session chosen
	//create a game object and pass in the above variable
	//hide the lobby.html and show the game.html
        startGame: function(e) {
            var name = $('#userid').val();
            var game = $(e.currentTarget).data("game");
	    var gameID=$(e.currentTarget).data("gameID");
	  
            var character = $(".character-select li.selected div").attr("class");

            localStorage.setItem("userName", name);
            localStorage.setItem("character", character);

            console.log("Joining " + game);

            if (name.length==0) {
                alert("Please enter a name.");
                return;
            }

            $("#lobby").hide();
            $("#game").show();

            new Game({
                playerName: name,
                
                character: character,
                game: game,
		  gameID:gameID  
            });

            console.log({
                            playerName: name,
                            
                            character: character,
                            game: game,
		             gameID:gameID
                        });
        }

    });

    var gameTemplate = _.template('<div class="game-mode <%= type %>">'+
                                    '<div class="counter"><%= count %></div>' +
				     '<div class="gameID"><%= gameID %></div>' +
                                    '<div class="play">play</div>' +
                                '</div>)');

 

});
