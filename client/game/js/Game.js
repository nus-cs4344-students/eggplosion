define([
    "jquery", "underscore", "backbone",

    "text!../html/game.html",

    "local",
    "Networking",
    "World"
], function($, _, Backbone, tpl) {

    Game = Backbone.View.extend({

        initialize: function(opt) {
            $("#game").html(tpl);

            _.defer(_.bind(this.layout, this));

            $(window).resize(_.bind(this.layout, this));
		
	    //create game world
            this.world = new World({ container: $("#view") });

            // create our player
            this.world.player = new Character({
                name: opt.playerName,
                
                character: opt.character
            });
            this.world.players.add(this.world.player);

            // initialize network
            this.networking = new Networking({
                world: this.world,
                game: opt.game,
		gameID:opt.gameID
            });

            // initialize local
            this.local = new LocalManager({
                document: $(document),
                world: this.world,
                network: this.networking
            });

            this.lastTime = getTicks();

            _.defer(_.bind(this.update, this));

           
        },

	//initialize layout of screen
        layout: function() {
            var view = $("#view");
            var p = $(document);

            view.css({
                left: 220 + (p.width() - 220 - view.width()) / 2 + 'px',
                top: '20px'
            });

            var $chat = $("#chat");
            $chat.css({
                height: (p.height() - view.height() - 50) + 'px'
            });

            $chat.prop('scrollTop', $chat.prop('scrollHeight') );
        },
	
	//update the local and world when it is called
        update: function() {
            var now = getTicks();
            var delta = (now - this.lastTime) / 1000;

            this.local.update(delta);
            this.world.update(delta);

            this.lastTime = now;

            window.requestAnimationFrame(_.bind(this.update, this));
        },


    

     

    });

 
    function getTicks() {
        return new Date().getTime();
    }

});
