//declare var window;
//declare var Utils;
var Movie = (function () {
    function Movie(_video_file) {
        this.video_file = _video_file;
        this.tmdb = global.tmdb; //TODO: fix this leaky logic
        this.search_title = '';
        this.search_year = '';
        this._is_poster_loaded = false;
        this.movie_info = {
            id: 0,
            imdb_id: '',
            title: "",
            year: 0,
            tagline: "",
            description: "",
            posterpath: "",
            genres: [],
            cast: [],
            crew: []
        };
        this._onPosterLoaded = [];
    }
    Movie.prototype.getDirector = function () {
        for (var iii = 0; iii < this.movie_info.crew.length; iii++) {
            if (this.movie_info.crew[iii].job == "Director") {
                return this.movie_info.crew[iii].name;
            }
        }
    };
    Movie.prototype.get_nth_cast = function (num) {
        for (var iii = 0; iii < this.movie_info.cast.length; iii++) {
            if (this.movie_info.cast[iii].order == num) {
                return this.movie_info.cast[iii].name;
            }
        }
    };
    // use filename to get the title and year of the movie
    // sets the variables and returns true if match found, else returns false
    Movie.prototype.infer_title_and_year = function () {
        var basename = this.video_file.get_base_name();
        // regex to eliminate sample files
        var regex = /sample/i;
        if (regex.test(basename)) {
            return false;
        }
        // regex to capture the title and year
        regex = /\b([A-Za-z0-9 ]+?)\b[() .\[\]]*((?:19|20)\d\d)/i;
        var matches = regex.exec(basename.split(".").join(" "));
        if (matches !== null) {
            this.search_title = matches[1];
            this.search_year = matches[2];
            return true;
        }
        else {
            return false;
        }
        ;
    };
    // gets the movie information from TMDb's database
    // and saves the info to files and populates the data fields
    // calls the callback with true if hit found, false otherwise
    // also passes the Movie object itself and a parameters object
    Movie.prototype.get_and_save_info = function (cb, param) {
        var _this = this;
        var onSearch = function (result) {
            if (result == "not found") {
                cb(false, _this, param);
            }
            else {
                _this.tmdb.get_movie_info(result.id, onReturnInfo);
            }
        };
        var onReturnInfo = function (result) {
            if (result == "not found") {
                cb(false, _this, param);
            }
            else {
                _this.movie_info.title = result.title;
                _this.movie_info.id = result.id;
                _this.movie_info.imdb_id = result.imdb_id;
                _this.movie_info.description = result.overview;
                _this.movie_info.tagline = result.tagline;
                _this.movie_info.posterpath = _this.tmdb.IMAGE_BASE_URL + "w154" + result.poster_path;
                _this.movie_info.genres = result.genres;
                _this.tmdb.get_credits(result.id, onReturnCredits);
            }
        };
        var onReturnCredits = function (result) {
            if (result == "not found") {
                cb(false, _this, param);
            }
            else {
                _this.movie_info.cast = result.cast;
                _this.movie_info.crew = result.crew;
                cb(true, _this, param);
            }
        };
        this.tmdb.search_movie(this.search_title, onSearch);
    };
    /*
        @blob : blob of image file to set as poster
        Sets the poster to the passed image blob
        Then calls the pending callbacks that need the poster object
    */
    Movie.prototype.set_poster_blob = function (blob) {
        var _this = this;
        this._poster_blob = blob;
        if (!this._is_poster_loaded) {
            this._is_poster_loaded = true;
            this._onPosterLoaded.forEach(function (callback) {
                callback(_this._poster_blob);
            });
            this._onPosterLoaded = [];
        }
    };
    /*
        Fetches the poster from the url specified in the Movie's movie_info object
        Then calls the pending callbacks that need the poster object
    */
    Movie.prototype.load_poster = function () {
        var _this = this;
        Utils.get_image(this.movie_info.posterpath, function (blob) {
            _this.set_poster_blob(blob);
        });
    };
    // called by the party that wants the poster
    // callback has same signature as _onPosterLoaded
    Movie.prototype.poster = function (cb) {
        if (this._is_poster_loaded) {
            cb(this._poster_blob);
        }
        else {
            this._onPosterLoaded.push(cb);
        }
    };
    return Movie;
}());
