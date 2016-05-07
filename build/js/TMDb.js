/*
    A thin wrapper for TheMovieDb.org's API.
*/
var TMDb;
(function (TMDb_1) {
    var API_KEY = '';
    var SEARCH_URL = "http://api.themoviedb.org/3/search/movie";
    var MOVIE_INFO_URL = "http://api.themoviedb.org/3/movie/MOVIE_ID";
    var IMAGE_BASE_URL = "http://image.tmdb.org/t/p/";
    var CREDITS_URL = "http://api.themoviedb.org/3/movie/MOVIE_ID/credits";
    var REVIEWS_URL = "http://api.themoviedb.org/3/movie/MOVIE_ID/reviews";
    var GENRES_URL = "http://api.themoviedb.org/3/genre/list";
    var TMDb = (function () {
        function TMDb(api_key) {
            var _this = this;
            API_KEY = api_key;
            this.IMAGE_BASE_URL = IMAGE_BASE_URL;
            this.req_queue = [];
            this.req_count = 0;
            this.max_req_per_10_sec = 40;
            setInterval(function () {
                _this.req_count = 0;
                _this.flush_req();
            }, 10 * 1000);
        }
        TMDb.prototype.flush_req = function () {
            while (this.req_count < this.max_req_per_10_sec && this.req_queue.length > 0) {
                this.req_count++;
                this.req_queue.pop()();
                console.debug("queued request " + this.req_count + " flushed.");
            }
        };
        TMDb.prototype.register = function (func) {
            this.req_queue.push(func);
            this.flush_req();
        };
        // Searches for movies with the string provided.
        // The callback is called with the result of the search
        // The result parameter passed to the callback is either set to the object of the first hit,
        // or is set to the string "not found" if no hits were found.
        TMDb.prototype.search_movie = function (qry_str, cb) {
            this.register(function () {
                function on_reply(resp) {
                    if (resp.results.length > 0) {
                        cb(resp.results[0]);
                    }
                    else {
                        cb("not found");
                    }
                }
                $.getJSON(SEARCH_URL, {
                    api_key: API_KEY,
                    query: qry_str
                }, on_reply);
            });
        };
        // Gets detailed info about the movie with the ID passed
        // The callback is called with the result
        // If movie exists, and a proper object is returned, the callback is called with the returned object,
        // else it is called with the string "not found".
        TMDb.prototype.get_movie_info = function (id, cb) {
            this.register(function () {
                $.getJSON(MOVIE_INFO_URL.replace("MOVIE_ID", id.toString()), {
                    api_key: API_KEY
                }, on_reply);
                function on_reply(resp) {
                    if ("id" in resp) {
                        cb(resp);
                    }
                    else {
                        cb("not found");
                    }
                }
            });
        };
        TMDb.prototype.get_credits = function (id, cb) {
            this.register(function () {
                $.getJSON(CREDITS_URL.replace("MOVIE_ID", id.toString()), {
                    api_key: API_KEY
                }, on_reply);
                function on_reply(resp) {
                    if ("cast" in resp) {
                        cb(resp);
                    }
                    else {
                        cb("not found");
                    }
                }
            });
        };
        /*
            calls callback with true if found and false if not found as the first argument.
            The genres array is passed as the second argument  if successful.

            cb: Callback with the parameters:
                error: error thrown if the list could not be fetched. Null if no error.
                genres_array: Array of genre objects. Null if error occured.
        */
        TMDb.prototype.get_genres = function (cb) {
            this.register(function () {
                $.getJSON(GENRES_URL, {
                    api_key: API_KEY
                }, on_reply).fail(function (blah, blaah, err) {
                    cb(new Error("Could not get genres list: " + err));
                });
                function on_reply(resp) {
                    //            console.log("Got the fucking reply.");
                    //            console.log(resp);
                    if ("genres" in resp) {
                        cb(null, resp.genres);
                    }
                    else {
                        cb(Error("Could not get genres list from server."), null);
                    }
                }
            });
        };
        return TMDb;
    }());
    TMDb_1.TMDb = TMDb;
})(TMDb || (TMDb = {}));
