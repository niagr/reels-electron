var ITEM_ALL = {
    id: -1,
    name: "All"
};
var NavBar = (function () {
    function NavBar(_$container, callback) {
        if (!_$container) {
            throw new Error('Invalid container element.');
        }
        else
            this.$container = _$container;
        this.$container.addClass('navbar');
        if (callback) {
            this.onItemSelected(callback);
        }
        this.widgetForItemName = {};
        this.itemAllAdded = false;
        this.itemList = [];
        if (this.itemAllAdded == false) {
            this.addItem(ITEM_ALL);
            this.itemAllAdded = true;
        }
    }
    NavBar.prototype.onItemSelected = function (callback) {
        this.onItemSelectedCallback = callback;
    };
    /*
        Adds an array of items to the list and the filter if not already present
    */
    NavBar.prototype.addItems = function (items) {
        var _this = this;
        items.forEach(function (item_from_movie) {
            var found = false;
            _this.itemList.forEach(function (item_from_list) {
                if (item_from_movie.id === item_from_list.id) {
                    found = true;
                }
            });
            if (found === false) {
                _this.itemList.push(item_from_movie);
                _this.addItem(item_from_movie);
            }
        });
    };
    // BAD: recursive wrt setSelected
    // public forceSelectitem (item: IItem) {
    //     this.setSelected(item);
    // }
    NavBar.prototype.addItem = function (item) {
        var _this = this;
        var $item = $('<li>' + item.name + '</li>');
        $item.click(function (ev) { return _this.onItemSelectedCallback(item); });
        this.$container.append($item);
        this.widgetForItemName[item.name] = $item;
    };
    NavBar.prototype.setSelected = function (item) {
        this.$container.children('li').removeClass('selected');
        this.widgetForItemName[item.name].addClass('selected');
    };
    return NavBar;
}());
