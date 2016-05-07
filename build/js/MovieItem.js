/// <reference path="./Movie.ts"/>
var MovieItem = (function () {
    function MovieItem(_movie, evHandler) {
        var _this = this;
        var that = this;
        this.movie = _movie;
        this.$item_container = $('<div class="movie-item"> </div>');
        this.$poster = $('<img class="movie-poster">');
        var html = '<div class="movie-info-container">' +
            '<a class="movie-title"></a>' +
            '<br/><br/>' +
            '<a class="director"></a>' +
            '<br/>' +
            '<a class="cast"></a>' +
            '<br/><br/>' +
            '<p class="movie-description"></p>' +
            '</div>';
        this.$movie_info_comtainer = $(html);
        html = '<div class="controls-box">' +
            '<div class="controls-wrapper">' +
            (_movie.movie_info.imdb_id != '' ? '<img class="control-button open-imdb-page-button" src="../icons/IMDb_icon.png">' : '') +
            '<br/>' +
            '<img class="control-button play-button" src="../icons/play-grey.png">' +
            '<br/>' +
            '<img class="control-button info-button" src="../icons/help-info-grey.png">' +
            '<br/>' +
            '<img class="control-button open-dir-button" src="../icons/folder.svg">' +
            '</div>' +
            '</div>';
        this.$controls_box = $(html);
        this.$controls_box.find(".play-button").click(function (event) {
            _this.buttonCliclAnimation($(event.target));
            evHandler.play(that);
        });
        this.$controls_box.find(".open-dir-button").click(function (event) {
            _this.buttonCliclAnimation($(event.target));
            evHandler.open_dir(that);
        });
        this.$controls_box.find(".open-imdb-page-button").click(function (event) {
            _this.buttonCliclAnimation($(event.target));
            evHandler.open_imdb_page(that);
        });
        this.$movie_title = this.$movie_info_comtainer.children(".movie-title");
        this.$director = this.$movie_info_comtainer.children(".director");
        this.$cast = this.$movie_info_comtainer.children(".cast");
        this.$movie_description = this.$movie_info_comtainer.children(".movie-description");
        this.movie.poster(function (blob) {
            var img_url = URL.createObjectURL(blob);
            _this.$poster.attr("src", img_url);
            // myConsole.log(`${posterCount++}: set image source of movie item for ${this.movie.movie_info.id}`);
        });
        this.$movie_title.text(this.movie.movie_info.title);
        this.$director.text("Directed by " + this.movie.getDirector());
        var cast = this.movie.movie_info.cast
            .sort(function (a, b) { return a.order - b.order; })
            .map(function (c) { return c.name; })
            .slice(0, 3);
        this.$cast.text("Cast: " + cast[0] + ", " + cast[1] + ", " + cast[2]);
        this.$movie_description.text(this.movie.movie_info.description);
        this.$item_container.append(this.$poster);
        this.$item_container.append(this.$movie_info_comtainer);
        this.$item_container.append(this.$controls_box);
    }
    MovieItem.prototype.buttonCliclAnimation = function ($button) {
        $button.addClass('control-button-clicked');
        var delay = 200; // set this to be greater than the duration of the animation.
        setTimeout(function () { return $button.removeClass('control-button-clicked'); }, delay);
    };
    return MovieItem;
}());
