define([
    "jquery", "underscore", "backbone",

    "Map",
    "Bomb",
    "Flame",
    "Character",

    "GameCanvas"
],function($, _, Backbone, core) {


    var ortho = [
        {x:0, y:0, d: 0 },
        {x:1, y:0, e: 4, d: 2},
        {x:-1, y:0, e: 6, d: 2},
        {x:0, y:-1, e: 3, d: 1},
        {x:0, y:1, e: 5, d: 1}
    ];

    //collections of different objects in the game world.
    PlayerCollection = Backbone.Collection.extend({
        comparator: function(p) {
            return p.get('y');
        }
    });

    BombsCollection = Backbone.Collection.extend({});

    BreakersCollection = Backbone.Collection.extend({
        initialize: function() {
            this.on('add', this.onAdd, this);
        },

        onAdd: function(b) {
            b.on('done', this.onDone, this);
        },

        onDone: function(b) {
            this.remove(b);
        }
    });

    FlamesCollection = Backbone.Collection.extend({
        initialize: function() {
            this.on('add', this.onFlameAdded, this);
        },

        onFlameAdded: function(f) {
            f.on('done', this.onFlameDone, this);
        },

        onFlameDone: function(f) {
            this.remove(f);
        }
    });


    World = Backbone.Model.extend({
    
    //create variables
        /** element to hold the map into */
        $container: null,

        map: null,
        mapView: null,

        /** our player */
        player: null,

        /** all players */
        players: new PlayerCollection,

        /** bombs */
        bombs: new BombsCollection,
        /** queue of bombs to be placed */
        placeBombs: new BombsCollection,

        flames: new FlamesCollection(),
        breakings: new BreakersCollection(),

        //initialize world        
        initialize: function(opt) {
            this.$container = opt.container;

            this.map = new Map();

            this.players.on('add', this.onCharacterAdded, this);
            this.players.on('remove', this.onCharacterRemoved, this);

            this.bombs.on('add', this.onBombAdded, this);
            this.bombs.on('remove', this.onBombRemoved, this);

            this.flames.on('remove', this.onFlameRemoved, this);

            this.canvas = new GameCanvas({world: this});
        },
        
        
        onCharacterAdded: function(c) {
            this.updateScoring(true);
        },

        onCharacterRemoved: function(c) {
            this.updateScoring(true);
        },

        /** bombs */
        placeBomb: function(x, y) {
            // add on temporary queue
            this.placeBombs.add(new Bomb({x: x, y: y}));
        },
        
        //handle what happen when a bomb went off
    
        explodeBomb: function(b, strength) {
            this.bombs.remove(b);

            var bx = b.get('x');
            var by = b.get('y');
            var owner = b.get('owner');

            _.each(ortho,_.bind(function(o) {
                for(var i=1; i<=strength; i++) {
                    var fx = bx + o.x * i;
                    var fy = by + o.y * i;

                    if (this.map.getTile(fx, fy) != 0)
                        return; // stop on obstacle

                    this.addMergeFlame(fx, fy, i == strength ? o.e : o.d, owner);

                    if (o.d == 0) return; // special case for center
                }
            },this));

            throttlePlay('explode-break');
        },

        //merge the different direction flames together
        addMergeFlame: function(x, y, type, owner) {

            var ef = this.map.getFlame(x,y);

            if (ef) {
                // merge
                ef.mergeWith(type);

                if (owner != this.player.id)
                    ef.set('owner', owner);
            } else {
                // add new
                ef = new Flame({x: x, y: y, type: type, owner: owner});
                this.flames.add(ef);
                this.map.setFlame(x, y, ef);
            }
        },
        
        //event handlers for bomb and flame
        onBombAdded: function(b) {
            this.map.setBomb(b.get('x'), b.get('y'), b);
        },

        onBombRemoved: function(b) {
            this.map.setBomb(b.get('x'), b.get('y'), null);
        },

        onFlameRemoved: function(f) {
            this.map.setFlame(f.get('x'), f.get('y'), null);
        },
        
        //update function to update all objects in the game world
        update: function(dt) {

            this.players.each(function(p) { p.update(dt); });
            this.bombs.each(function(b) { b.update(dt); });
            this.flames.each(function(f) { f.update(dt); });
            this.breakings.each(function(b) { b.update(dt); });

            this.canvas.update(dt);
        },
    
        //get latest score for player
        updateScoring: function(recreate) {
            var $st = $("#scores");
            if (recreate) {
                $st.empty();
                _.each(this.players.sortBy(function(p) { return -p.get('score'); }), function(p) {
                    var si = $(scoreItemTemplate({id: p.id, name: p.get('name'), score: p.get('score'), color: p.get('character') }));

                   

                    updateLag($('.lag', si), p.get('lag'));

                    $st.append(si);
                });
            } else {
                this.players.each(function(p) {
                    var si = $("div[data-id="+p.id+"]", $st);
                    // lag
                    updateLag($('.lag', si), p.get('lag'));
                });
            }
        },
        
        //get latest score for other players
 
    });
    
    //update how laggy it is for each player
    var updateLag = function($lag, lag) {
        var lagw = lagBar(lag, 20, 300, 48, 8);
        var cg = Math.round(lagBar(lag, 20, 250, 255, 0));
        var cr = 255 - cg;

        $lag.css({
            width: lagw+'px',
            'background-color': 'rgb('+cr+','+cg+',0)'
        })
    }

    var scoreItemTemplate = _.template(
        '<div data-id="<%= id %>" class="score-item color-<%= color %>">' +
            '<div class="icon"></div>' +
            '<div class="player"><%= name %></div>' +
            '<div class="score"><%= score %></div>' +
            '<div class="lag"></div>' +
        '</div>');



    var throttlePlay = _.throttle(function(snd) {
        play(snd)
    }, 50);

    var lagBar = function(x, minLag, maxLag, minVal, maxVal) {
        var dlag = maxLag - minLag;
        var dval = maxVal - minVal;
        var a = dval / dlag;
        var b = minVal - minLag * dval / dlag;

        return clampa(a*x + b, minVal, maxVal);
    }

    var clampa = function(x, a, b) {
        if (a < b) return clamp(x, a, b)
        return clamp(x, b, a);
    }

    var clamp = function(x, a, b) {
        if (x < a) return a;
        if (x > b) return b;
        return x;
    }

});
