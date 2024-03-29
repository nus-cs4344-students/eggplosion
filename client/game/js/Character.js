
define([
    "jquery", "underscore", "backbone",

    "Sprite"
],function($, _, Backbone, core) {

    var ORIENT_DOWN = 0;
    var ORIENT_UP = 1;
    var ORIENT_RIGHT = 2;
    var ORIENT_LEFT = 3;


    //this is the structure of the Character class
    Character = Sprite.extend({
        defaults: {
            name: '?',
            character: 'john',
            x: 0,
            y: 0,
            orient: ORIENT_DOWN,
            moving: false,
            dead: true,
            score: 0
        },

        //this method is to get the new x and y coordinate of the character
        deltaMove: function(x, y) {
            this.set('x', this.get('x') + x);
            this.set('y', this.get('y') + y);

            if (x<0)
                this.set('orient', ORIENT_LEFT);
            else if (x>0)
                this.set('orient', ORIENT_RIGHT);
            else if (y<0)
                this.set('orient', ORIENT_UP);
            else if (y>0)
                this.set('orient', ORIENT_DOWN);
        },
        
        //this method is to make the character die if it is caught in explosion(flame)
        die: function(flame) {
            this.set('dead', true);
            this.trigger('die', flame);
            this.set('frame', 0);
        },
        
        //this method is for chat purpose
        sendMessage: function(msg) {
            this.set('chat', msg);
        }
    });

});
