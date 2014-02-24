
/**
 * A collection of Movies.
 *
 * a page number can be passed for pagination, when first init it caches a lightweight
 * version on all movies for placeholders that can be found here app.stores.movies
 *
 * A fully loaded and range limited collection is provided in success callback
 */
app.MovieCollection = Backbone.Collection.extend({
  model: app.Movie,

  cached: [],
  fullyLoaded: false,

  sync: function(method, model, options) {
    if (method === "read") {

      var self = this,
        fullRange = (typeof options.fullRange != 'undefined' && options.fullRange === true),
        page = app.moviePageNum;

      // model for params
      var args = {
        range: app.helpers.createPaginationRange(app.moviePageNum, fullRange)
      };

      // CACHE GET
      // empty cache if first load
      if(app.moviePageNum === 0){
        app.stores.movies = [];
      }
      // prep empty cache
      if(typeof app.stores.movies == 'undefined'){
        app.stores.movies = [];
      }
      // if fullrange called and cache exists
      if(fullRange && app.stores.movies.length > 0){
        // we always return cache
        // Could do some more checking for edge cases but is a simple solution
        options.success(app.stores.movies);
        return;
      }

      // init the xbmc collection
      app.cached.movieXbmcCollection = new app.MovieXbmcCollection(args);
      // fetch results
      app.cached.movieXbmcCollection.fetch({"success": function(data){
        // add models to cache
        $.each(data.models,function(i,d){
          app.stores.movies.push(d);
        });

        // if models less than ipp then must be the end
        if(data.models.length > app.itemsPerPage){
          self.fullyLoaded = true;
        }
        // return callback
        options.success(data.models);
      }});

    }
  }
});


/**
 * A collection of Recently added Movies.
 */
app.MovieRecentCollection = Backbone.Collection.extend({
  model: app.Movie,

  cached: [],
  fullyLoaded: false,

  sync: function(method, model, options) {

    var opt = [app.movieFields, {'end': 100, 'start': 0}];
    app.xbmcController.command('VideoLibrary.GetRecentlyAddedMovies', opt, function(data){
      console.log(data);
      options.success(data.result.movies);
    });

  }

});


/**
 * A collection of movies matching a filter
 */
app.MovieFitleredCollection = Backbone.Collection.extend({
  model: app.Movie,

  sync: function(method, model, options) {

    // init cache
    if(app.stores.moviesFiltered === undefined){
      app.stores.moviesFiltered = {};
    }

    var sort = {"sort": {"method": "title"}},
      opt = [app.movieFields, {'end': 500, 'start': 0}, sort, options.filter],
      key = 'movies:key:filter';

    // cache
    for(var k in options.filter){
      key = 'movies:' + k + ':' + options.filter[k];
    }

    // if cache use that
    if(app.stores.moviesFiltered[key] !== undefined){
      // return from cache
      options.success(app.stores.moviesFiltered[key]);
    } else {
      // else lookup
      app.xbmcController.command('VideoLibrary.GetMovies', opt, function(data){
        // save cache
        app.stores.moviesFiltered[key] = data.result.movies;
        // return
        options.success(data.result.movies);
      });
    }

  }

});


/**
 * A lightweight collection of all movies (cached).
 */
app.MovieAllCollection = Backbone.Collection.extend({
  model: app.Movie,

  sync: function(method, model, options) {

    if(typeof app.stores.allMovies == 'undefined'){
      console.log('nocachehere');
      // no cache, do a lookup
      var allMovies = new app.AllMovieXbmcCollection();
      allMovies.fetch({"success": function(data){
        console.log('fetcged');
        // Sort
        data.models.sort(function(a,b){ return app.helpers.aphabeticalSort(a.attributes.label, b.attributes.label);	});
        // Cache
        app.stores.allMovies = data.models;
        // Return
        options.success(data.models);
      }});
      $(window).trigger('allMoviesCached');
    } else {
      // else return cache;
      options.success(app.stores.allMovies);
    }

  }

});


/**
* A collection of movies based on a custom array of movie ids
* requires an a property of items[] in options
*/
app.CustomMovieCollection = Backbone.Collection.extend({
  model: app.Movie,

  sync: function(method, model, options) {

    app.xbmcController.entityLoadMultiple('movie', options.items, function(movies){
      options.success(movies);
    });

  }

});


