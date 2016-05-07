var GENRE_ALL = {
    id: -1,
    name: "All"
};
// This object controls the user interface
var GUIController = (function () {
    function GUIController(controller) {
        var _this = this;
        var that = this;
        this.controller = controller;
        this.movie_item_list = [];
        this.$container = $('#container');
        this.main_view = new ListView();
        this.$content_container = $('#content');
        this.$player = $('<video class="player"></video');
        this.$sidebar = $('#sidebar');
        // public for debugging purposes
        this.$toolbar = $('#toolbar');
        this.searchbox = new SearchBox(function (query) { return _this.search(query); });
        this.searchview = new ListView();
        this.genreview = new ListView();
        this.$genre_filter = $('#genres-list');
        this.genre_list = [];
        //console.log(this.$genre_filter);
        this.current_view = 'listview';
        this.playing = false;
        this.genre_all_added = false;
        this.init_ui();
    }
    GUIController.prototype.init_ui = function () {
        var _this = this;
        console.log("initializing UI");
        this.$toolbar.append(this.searchbox.$main_container);
        $("#add-button").click(function () {
            console.log("clicked");
            Platform.fs.chooseEntry("directory", function (entry) {
                console.log("selected directory " + entry.get_base_name());
                _this.controller.load_new_movies_from_dir(entry);
            }, undefined); // TODO: Add Error handling
        });
        $("#close-button").click(function (event) {
            window.close();
        });
        $('#expand-button').click(function (event) {
            _this.expand_sidebar();
        });
        this.$content_container.append(this.main_view.$main_container);
        this.navbar = new NavBar($('#navbar'), this.show_genre.bind(this));
        this.show_genre(GENRE_ALL);
    };
    GUIController.prototype.show_genre = function (req_genre) {
        var _this = this;
        this.navbar.setSelected(req_genre);
        this.genreview.clear();
        if (req_genre.name == 'All') {
            this.toggle_view('listview');
        }
        else {
            this.toggle_view('genreview');
            this.movie_item_list.forEach(function (movie_item) {
                var added = false;
                movie_item.movie.movie_info.genres.forEach(function (movie_genre) {
                    if (added == false && req_genre.id == movie_genre.id) {
                        _this.genreview.add_item(movie_item);
                        added = true;
                    }
                });
            });
        }
    };
    GUIController.prototype.search = function (query) {
        var _this = this;
        this.searchview.clear();
        if (query == '') {
            this.show_genre(GENRE_ALL);
        }
        else {
            this.toggle_view('searchview');
            var regex = new RegExp(query, 'i');
            this.movie_item_list.forEach(function (movie_item, index, list) {
                if (regex.test(movie_item.movie.movie_info.title)) {
                    _this.searchview.add_item(movie_item);
                }
            });
        }
    };
    GUIController.prototype.toggle_view = function (view) {
        var _this = this;
        var add = function (list_view) {
            _this.current_view = view;
            _this.$content_container.append(list_view.$main_container);
        };
        this.$content_container.children().detach();
        switch (view) {
            case 'listview':
                add(this.main_view);
                break;
            case 'searchview':
                add(this.searchview);
                break;
            case 'genreview': add(this.genreview);
        }
    };
    GUIController.prototype.expand_sidebar = function () {
        $('#toolbar, #content').toggleClass('sidebar-collapsed');
        $('#sidebar, #toolbar, #content').toggleClass('sidebar-expanded');
    };
    GUIController.prototype.add_movie_item = function (movie) {
        var movie_item = new MovieItem(movie, {
            play: this.play_movie,
            stop: this.stop_movie,
            open_dir: this.open_containing_directory,
            open_imdb_page: this.open_imdb_page
        });
        this.movie_item_list.push(movie_item);
        this.main_view.add_item(movie_item);
        this.navbar.addItems(movie.movie_info.genres);
    };
    GUIController.prototype.play_movie = function (movie_item) {
        Platform.fs.openFileWithSystemDefault(movie_item.movie.video_file);
    };
    GUIController.prototype.open_containing_directory = function (movie_item) {
        movie_item.movie.video_file.getParentDirectory().then(function (dir) {
            Platform.fs.openFileWithSystemDefault(dir);
        }, function (err) {
            console.log(err.message);
        });
    };
    GUIController.prototype.open_imdb_page = function (movie_item) {
        var IMDB_BASE_URL = "http://www.imdb.com/title/";
        Platform.fs.openURLWithSystemDefault(IMDB_BASE_URL + movie_item.movie.movie_info.imdb_id);
    };
    GUIController.prototype.stop_movie = function () {
        // TODO: Remove this dead code
        // if (this.playing) {
        //     this.$player.get(0).pause();
        //     this.$player.detach();
        //     this.$container.appendTo('body');
        //     this.playing = false;
        // }
    };
    return GUIController;
}());
