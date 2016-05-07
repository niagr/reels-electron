/// <reference path="./MovieItem.ts"/>
var SearchView = (function () {
    function SearchView() {
        var that = this;
        this.$main_container = $("<div class='search-view'><div>");
        this.movie_item_container = [];
    }
    /*
      Add a MovieItem to be shown as the results.
        movie_info: MovieItem to add to the SearchView
    */
    SearchView.prototype.add_item = function (movie_item) {
        var $clone = movie_item.$item_container.clone();
        this.movie_item_container.push(movie_item);
        this.$main_container.append($clone);
    };
    // Clear the SearchView of all results
    SearchView.prototype.clear = function () {
        this.$main_container.children().remove();
        this.movie_item_container = [];
    };
    return SearchView;
}());
