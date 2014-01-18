/**
 * Album List View
 *
 * List of full album views
 * used in: artist album listings
 *
 * @type Backbone View
 */
app.AlbumsList = Backbone.View.extend({

  tagName:'div',

  className:'artist-list-view',

  initialize:function () {
    var self = this;
    this.model.on("reset", this.render, this);
    this.model.on("add", function (album) {
      self.$el.append(new app.AlbumItemView({model:album}).render().el);
    });
  },

  render:function () {
    this.$el.empty();
    _.each(this.model.models, function (album) {
      this.$el.append(new app.AlbumItemView({model:album}).render().el);
    }, this);
    return this;
  }
});


/**
 * Full Album View
 * Used as a wrapper to piece all the album sub views together
 *
 * @type Backbone View
 */
app.AlbumItemView = Backbone.View.extend({

  tagName:"div",

  initialize:function () {
    this.model.on("change", this.render, this);
    this.model.on("destroy", this.close, this);
  },

  render:function () {
    this.$el.html(this.template(this.model.attributes));

    // meta / thumbnail
    $('.album-info', this.$el).html(new app.AlbumItemSmallView({model: this.model}).render().$el);

    // songs
    $(".tracks", this.$el).html(new app.SongListView({"model":this.model.attributes.songs}).render().el);

    return this;
  }

});


/**
 * List of Album Item Small Views
 * used in: album landing, search results
 *
 * @type Backbone View
 */
app.SmallAlbumsList = Backbone.View.extend({

  tagName:'ul',

  className:'album-list-small',

  render:function () {
    this.$el.empty();
    _.each(this.model.models, function (album) {
      this.$el.append(new app.AlbumItemSmallView({model:album}).render().el);
    }, this);
    return this;
  }

});


/**
 * Album Item Small
 *
 * This is the small view of an album, it includes artwork, title, artist and actions
 * used in: album landing, search results, called into full album template
 *
 * @type Backbone View
 */
app.AlbumItemSmallView = Backbone.View.extend({

  tagName:"li",
  className:'album-small-item card',

  events: {
    "click .album-play": "playAlbum",
    "click .album-add": "addAlbum",
    "click .album-thumbsup": "thumbsUp"
  },

  initialize:function () {
    this.model.on("change", this.render, this);
    this.model.on("destroy", this.close, this);
  },

  render:function () {
    var model = this.model.attributes;

    // enrich the model
    model.title = ( typeof model.label != "undefined" ? model.label : model.album );
    model.url = '#album/' + model.albumid;
    model.img = app.parseImage(model.thumbnail);
    // parse artist details a bit
    model.displayartistid = (typeof model.artistid[0] != 'undefined' ? model.artistid[0] : '');
    model.displayartisturl = (model.displayartistid != '' ? '#artist/' + model.displayartistid : '#artists');

    // apply template
    this.$el.html(this.template(model));

    // classes
    if(!app.helpers.isDefaultImage(model.img)){
      this.$el.addClass('has-thumb');
    }
    if(app.playlists.isThumbsUp('album', model.albumid)){
      this.$el.addClass('thumbs-up');
    }

    return this;
  },


  /**
   * play an album from start, replacing current playlist
   */
  playAlbum: function(e){
    e.stopPropagation();
    // clear playlist. add artist, play first song
    var album = this.model.attributes;
    app.AudioController.playlistClearAdd( 'albumid', album.albumid, function(result){
      app.AudioController.playPlaylistPosition(0, function(){
        app.AudioController.playlistRefresh();
      });
    });

  },

  /**
   * append to playlist
   */
  addAlbum: function(e){
    e.stopPropagation();
    // clear playlist. add artist, play first song
    var album = this.model.attributes;
    app.AudioController.playlistAdd( 'albumid', album.albumid, function(result){
      app.notification(album.album + ' added to the playlist');
      app.AudioController.playlistRefresh();
    });

  },

  /**
   * toggle thumbs up
   */
  thumbsUp: function(e){
    e.stopPropagation();
    var album = this.model.attributes,
      albumid = this.model.attributes.albumid,
      op = (app.playlists.isThumbsUp('album', albumid) ? 'remove' : 'add'),
      $el = $(e.target).closest('.card');
    app.playlists.setThumbsUp(op, 'album', albumid);
    $el.toggleClass('thumbs-up');

  }

});
