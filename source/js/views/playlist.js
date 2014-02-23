/*
 * Sidebar artist list
 */



app.PlaylistView = Backbone.View.extend({

  tagName:'div',

  className:'playlist-wrapper',

  events: {
    "click .player-audio": "viewAudio",
    "click .player-video": "viewVideo"
  },

  initialize:function () {

  },

  render:function () {
    // html
    this.$el.empty();
    var pos = 0, //position
      $tabs = $('<ul class="active-player-tabs"></ul>'),
      $items = $('<ul class="playlist"></ul>'),
      plId = (typeof this.model.playlistId != 'undefined' ? this.model.playlistId : 0);

    _.each(this.model.models, function (item) {
      item.pos = pos; pos++;
      item.playlistId = plId;
      $items.append(new app.PlaylistItemView({model:item}).render().el);
    }, this);
    this.$el.append($items);

    // reload thumbsup
    app.playlists.getThumbsUp();

    // bind others
    $(window).bind('playlistUpdate', this.playlistBinds());

    // make and prepend tabs
    $tabs.append('<li class="player-audio' + (plId === 0 ? ' active' : '') + '">Audio</li>');
    $tabs.append('<li class="player-video' + (plId == 1 ? ' active' : '') + '">Video</li>');

    this.$el.prepend($tabs);

    this.$el.addClass('plid-' + plId);

    return this;
  },

  playlistBinds:function(){

    //sortable
    $sortable = $( "ul.playlist");
    $sortable.sortable({
      placeholder: "playlist-item-placeholder",
      handle: ".playlist-play",
      items: "> li",
      axis: "y",
      update: function( event, ui ) {
        app.playlists.sortableChangePlaylistPosition(event, ui);
      }
    }).disableSelection();

  },

  viewAudio:function(e){
    app.AudioController.playlistRender();
  },

  viewVideo:function(e){
    app.VideoController.playlistRender();
  }

});

app.PlaylistItemView = Backbone.View.extend({

  tagName:"li",

  className: 'playlist-item',

  events: {
    "dblclick .playlist-play": "playPosition",
    "click .removebtn": "removePosition",
    "click .playbtn": "playPosition",
    "click .repeating": "cycleRepeat",
    "click .playlist-song-thumbsup": "thumbsUp",
    "click .playlist-song-menu": "menu"
  },

  initialize:function () {

  },

  render:function () {
    // file fallback
    var model = this.model;

    model.id = (typeof model.id != 'undefined' ? model.id : 'file');
    model.albumid = (typeof model.albumid != 'undefined' ? model.albumid : 'file');
    model.subLink = this.buildSubLink(model);
    model.url = (model.albumid != 'file' ? '#album/' + model.albumid : app.helpers.buildUrl(model.type, model.id));

    // render
    this.$el.html(this.template(model));

    // if file, add its path
    if(this.model.id == 'file'){
      $('.song', this.$el).data('file', model.file);
    }
    $('.song', this.$el).data('playlistId', model.playlistId);

    // add if thumbs up
    if( this.model.id != 'file' && app.playlists.isThumbsUp('song', this.model.id) ) {
      this.$el.addClass('thumbs-up');
    }
    return this;
  },


  /**
   * Contextual Menu
   * @param e
   */
  menu: function(e){
    if(this.model.playlistId == 1){
      app.helpers.menuDialog( app.helpers.menuTemplates('movie', this.model) );
    } else {
      app.helpers.menuDialog( app.helpers.menuTemplates('song', this.model) );
    }

  },


  playPosition:function(event){
    if(this.model.list == 'local'){
      // LOCAL BROWSER PLAY
      app.audioStreaming.playPosition(this.model.pos);
    } else {
      // XBMC PLAYER
      // Toggle between music / video playlists
      var playlistController = (this.model.playlistId == 1 ? app.VideoController : app.AudioController);
      // play and refresh
      playlistController.playPlaylistPosition(this.model.pos, function(data){
        playlistController.playlistRender();
      });
    }
  },


  removePosition:function(event){
    if(this.model.list == 'local'){
      // LOCAL BROWSER REMOVE
      app.audioStreaming.deleteBrowserPlaylistSong(this.model.pos);
      app.audioStreaming.renderPlaylistItems();
    } else {
      // XBMC PLAYER
      // Toggle between music / video playlists
      var playlistController = (this.model.playlistId == 1 ? app.VideoController : app.AudioController);
      var self = this;
      playlistController.removePlaylistPosition(this.model.pos, function(data){
        playlistController.playlistRender();
      });
    }
  },


  cycleRepeat:function(event){
    $('#footer').find('.player-repeat').trigger('click');
  },


  thumbsUp: function(e){
    e.stopPropagation();
    var id = this.model.id,
      type = (this.model.playlistId == 1 ? 'video' : 'song'),
      op = (app.playlists.isThumbsUp(type, id) ? 'remove' : 'add'),
      $el = $(e.target).closest('li');
    app.playlists.setThumbsUp(op, type, id);
    $el.toggleClass('thumbs-up');
  },


  /**
   * A helper to parse
   * @param model
   */
  buildSubLink: function(model){

    var url, text, title;

    if(model.type == 'song'){

      // build artist names
      model.albumArtistString = (typeof model.albumartist != 'undefined' && typeof model.albumartist[0] != 'undefined' ? model.albumartist[0] : '');
      model.artistString = (typeof model.artist != 'undefined' && typeof model.artist[0] != 'undefined' ? model.artist[0] : '');

      // build song vars
      title = 'Track: ' + this.model.track + ' Duration: ' + app.helpers.secToTime(this.model.duration);
      url = '#search/' + (model.albumArtistString !== '' ? model.albumArtistString : model.artistString);
      text = (model.artistString !== '' ? model.artistString : model.albumArtistString);

      // if no artist or album artist, return null
      if(model.artistString === '' && model.albumArtistString === ''){
        return '';
      }

    } else if (model.type == 'movie' || model.type == 'tvshow' || model.type == 'episode') {
      text = model.year;
      url = '#movies/year/' + model.year;
      title = 'More movies from ' + text;
    } else {
      return '';
    }

    // return link
    return '<a title="'+ title +'" href="' + url + '">' + text + '</a>';

  }


});





/**
 * Custom playlists
 */
app.PlaylistCustomListsView = Backbone.View.extend({

  tagName:'ul',
  className:'custom-lists',

  events: {
    "dblclick li": "replacePlaylist",
    "click .name": "toggleDetail"
  },

  initialize:function () {

  },

  render:function () {

    this.$el.empty();
    var pos = 0;

    _.each(this.model.models, function (item) {
      item.pos = pos; pos++;
      var el = new app.PlaylistCustomListItemView({model:item}).render();

      this.$el.append(el.el);
    }, this);

    // Add thumbs up to the top
    this.$el.prepend('<li class="list-item thumbsup-link"><a href="#thumbsup" class="name">Thumbs Up</a></li>');

    return this;
  },

  toggleDetail: function(e){
    var $this = $(e.target),
      $parent = $this.closest('li');

    if($parent.hasClass('open')){
      $parent.removeClass('open');
    } else {
      $parent.parent().find('li').removeClass('open');
      $parent.addClass('open');
    }

  }

});



app.PlaylistCustomListItemView = Backbone.View.extend({

  tagName:"li",

  className: 'list-item',

  events: {
    "dblclick .name": "replacePlaylist"
  },


  initialize:function () {

  },

  render:function () {
    this.$el.html(this.template(this.model.attributes));
    return this;
  }

});




