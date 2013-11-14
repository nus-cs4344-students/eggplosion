TILE_EMPTY = 0;
TILE_BRICK = 1;
TILE_SOLID = 2;

require.config(
    {
        baseUrl: "js",
        paths: {
            "backbone": "lib/backbone",
            "underscore": "lib/underscore",
            "text": "lib/text"
        },
        locale: "en"
    }
);


require([
    "jquery", "underscore", "backbone",
    "polyfills/jscript",
    //"facebook",
    "lobby"
],function($, _, Backbone, core) {


    /**
     * Initialize
     */
    $(function() {

        new LobbyView({el: $("#lobby")});

        $("#loading").hide();



    });

});

//display information into browswer as chat
function info(m) {
    chat(m, "info");
}

//display which player kill which player
function kill(p1, p2) {
    chat("<div class='bomb'></div><u>"+p1+"</u> killed by <u>"+p2+"</u>", "kill");
}

//display sucide by player
function suicide(p1, p2) {
    chat("<div class='bomb'></div><u>"+p1+"</u> suicided", "kill");
}

// General chat function
function chat(m, cls) {
    var d = $("<div>");
    d.html(m);
    d.addClass(cls);
    var $chat = $('#chat');
    $chat.append(d);
    $chat.prop('scrollTop', $chat.prop('scrollHeight') );
}

// Start the game
function play(snd) {
    // FIXME detect audio
    var a = new Audio("snd/" + snd + ".wav");
    a.play();
}
