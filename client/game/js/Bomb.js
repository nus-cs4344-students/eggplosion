
define([
    "jquery", "underscore", "backbone",

    "Sprite"
],function($, _, Backbone, core) {

//this is the class structure of the bomb object

    Bomb = Sprite.extend({
        defaults: {
            x: 0,
            y: 0,
            owner: -1
        }
    });

});
