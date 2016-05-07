var ListView = (function () {
    function ListView() {
        var that = this;
        this.$main_container = $("<div class='list-view'><div>");
        this.movie_item_container = [];
        if (!ListView.main) {
            ListView.main = this;
        }
    }
    /*
      Add a MovieItem to be shown as the results.
        movie_info: MovieItem to add to the SearchView
    */
    ListView.prototype.add_item = function (movie_item) {
        var $clone;
        if (ListView.main == this) {
            $clone = movie_item.$item_container;
        }
        else {
            $clone = movie_item.$item_container.clone(true);
        }
        this.movie_item_container.push(movie_item);
        this.$main_container.append($clone);
    };
    // Clear the SearchView of all results
    ListView.prototype.clear = function () {
        this.$main_container.children().remove();
        this.movie_item_container = [];
    };
    return ListView;
}());
