var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Platform;
(function (Platform) {
    var fs;
    (function (fs_1) {
        function init() {
            if (Platform.platform == 'WinRT') {
                fs_1.chooseEntry = chooseEntryWinRT;
                fs_1.openFileWithSystemDefault = openFileWithSystemDefaultWinRT;
                fs_1.openURLWithSystemDefault = openURLWithSystemDefaultWinRT;
                fs_1.appDataDir = appDataDirWinRT;
                fs_1.retainEntry = retainEntryWinRT;
                fs_1.restoreEntry = restoreEntryWinRT;
            }
            else if (Platform.platform == 'node-webkit') {
                fs_1.chooseEntry = chooseEntryNW;
                fs_1.openFileWithSystemDefault = openFileWithSystemDefaultNW;
                fs_1.appDataDir = appDataDirNW;
                fs_1.retainEntry = retainEntryNW;
                fs_1.restoreEntry = restoreEntryNW;
            }
        }
        fs_1.init = init;
        /**
         * Common function for creating a new file or directory from a DirEntry.
         *
         * @param flags - Used to specify whether to create a new entry or not. Defaults to false.
         *              if neither create nor exclusive are set, if the file does not exist, error will be called.
         *              If create is set and exclusive is not set, if the file does not exist it will be created.
         *              If create is set and exclusive is set, if the file exists, error will be called with an error instance.
         *
         * @param exists - Indicated whether the entry exists or not.
         *
         * @param isType - Callback to determine whether entry is a file/directory.
         *
         * @param createAndReturnItem - Callback to create a new file/directory entry and return it to the caller.
         *
         * @param returnItem - Callback to return an existing entry to the caller.
         *
         * @param error - Callback to return error to caller.
         *
         */
        function createEntry(flags, exists, isType, createAndReturnItem, returnItem, error) {
            if (flags.create) {
                if (!exists) {
                    createAndReturnItem();
                }
                else {
                    if (flags.exclusive) {
                        error("EEXIST");
                    }
                    else {
                        if (!isType) {
                            error("ETYPE");
                        }
                        else {
                            returnItem();
                        }
                    }
                }
            }
            else {
                if (!exists) {
                    error("ENEXIST");
                }
                else {
                    if (!isType) {
                        error("ETYPE");
                    }
                    else {
                        returnItem();
                    }
                }
            }
        }
        var WinRTEntry = (function () {
            function WinRTEntry(_storage_item) {
                this.storage_item = null;
                if (!_storage_item)
                    throw new Error("Cannot create entry: storage item is null or undefined");
                this.storage_item = _storage_item;
            }
            WinRTEntry.prototype.isDirectory = function () {
                return this.storage_item.isOfType(Windows.Storage.StorageItemTypes.folder);
            };
            WinRTEntry.prototype.isFile = function () {
                return this.storage_item.isOfType(Windows.Storage.StorageItemTypes.file);
            };
            WinRTEntry.prototype.get_base_name = function () {
                return this.storage_item.name;
            };
            WinRTEntry.prototype.get_full_path = function () {
                return this.storage_item.path;
            };
            WinRTEntry.prototype.getParentDirectory = function () {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    _this.storage_item.getParentAsync().done(function (parent) {
                        if (parent)
                            resolve(new WinRTDirEntry(parent));
                        else
                            reject(new Error("Could not get parent folder for " + _this.storage_item.name));
                    }, reject);
                });
            };
            /**
             * Ugly hack to allow access to the native file for passing to other WinRT APIs.
             * It's okay as long as this class is not exported.
             */
            WinRTEntry.prototype.getStorageItem = function () {
                return this.storage_item;
            };
            return WinRTEntry;
        }());
        var WinRTFileEntry = (function (_super) {
            __extends(WinRTFileEntry, _super);
            function WinRTFileEntry(file) {
                _super.call(this, file);
            }
            WinRTFileEntry.prototype.file = function (success_cb, error_cb) {
                Windows.Storage.FileIO.readBufferAsync(this.storage_item).then(function (buffer) {
                    var dataReader = Windows.Storage.Streams.DataReader.fromBuffer(buffer);
                    var bytes = new Uint8Array(buffer.length);
                    dataReader.readBytes(bytes);
                    dataReader.close();
                    success_cb(new Blob([bytes]));
                }, function (err) {
                    error_cb(err);
                }).done(undefined, function (err) {
                    error_cb(err);
                });
            };
            WinRTFileEntry.prototype.write = function (blob, callback) {
                var _this = this;
                console.log("writing file " + this.storage_item.name);
                var reader = new FileReader();
                reader.onloadend = function (ev) {
                    var bytes = new Uint8Array(ev.target.result);
                    try {
                        Windows.Storage.FileIO.writeBytesAsync(_this.storage_item, bytes).then(function () {
                            callback(null);
                        }).done(undefined, function (err) {
                            callback(err);
                        });
                    }
                    catch (e) {
                        // console.log(e.message);
                        callback(e);
                    }
                };
                reader.onerror = function (ev) {
                    console.log(reader.error);
                };
                reader.readAsArrayBuffer(blob);
            };
            return WinRTFileEntry;
        }(WinRTEntry));
        var WinRTDirEntry = (function (_super) {
            __extends(WinRTDirEntry, _super);
            function WinRTDirEntry(dir) {
                _super.call(this, dir);
            }
            WinRTDirEntry.prototype.getChildren = function (cb) {
                this.storage_item.getItemsAsync().done(function (itemList) {
                    var entryList = itemList.map(function (item) {
                        if (item.isOfType(Windows.Storage.StorageItemTypes.file)) {
                            return new WinRTFileEntry(item);
                        }
                        else if (item.isOfType(Windows.Storage.StorageItemTypes.folder)) {
                            return new WinRTDirEntry(item);
                        }
                    });
                    cb(entryList);
                });
            };
            WinRTDirEntry.prototype.getItem = function (name, itemType, flags, callback) {
                var _this = this;
                var process = function (exists, item) {
                    var createAndReturnFile = function () {
                        _this.storage_item.createFileAsync(name).done(function (file) {
                            callback(new WinRTFileEntry(file), null);
                        }, function (e) {
                            callback(null, e);
                        });
                    };
                    var createAndReturnFolder = function () {
                        _this.storage_item.createFolderAsync(name).done(function (folder) {
                            callback(new WinRTDirEntry(folder), null);
                        }, function (e) {
                            callback(null, e);
                        });
                    };
                    var returnFile = function () {
                        callback(new WinRTFileEntry(item), null);
                    };
                    var returnFolder = function () {
                        callback(new WinRTDirEntry(item), null);
                    };
                    var isFile = function () {
                        return item.isOfType(Windows.Storage.StorageItemTypes.file);
                    };
                    var isFolder = function () {
                        return item.isOfType(Windows.Storage.StorageItemTypes.folder);
                    };
                    var errorFile = function (e) {
                        switch (e) {
                            case "EEXIST":
                                callback(null, new Error(name + " already exists and the exclusive flag is set."));
                                break;
                            case "ENEXIST":
                                callback(null, new Error(name + " does not exist and create flag is not set."));
                                break;
                            case "ETYPE":
                                callback(null, new Error(name + " is a directory."));
                                break;
                            default:
                                callback(null, new Error(name + ": something went wrong getting this file"));
                        }
                    };
                    var errorFolder = function (e) {
                        switch (e) {
                            case "EEXIST":
                                callback(null, new Error(name + " already exists and the exclusive flag is set."));
                                break;
                            case "ENEXIST":
                                callback(null, new Error(name + " does not exist and create flag is not set."));
                                break;
                            case "ETYPE":
                                callback(null, new Error(name + " is a file."));
                                break;
                            default:
                                callback(null, new Error(name + ": something went wrong getting this file"));
                        }
                    };
                    if (itemType == "file") {
                        createEntry(flags, exists, isFile, createAndReturnFile, returnFile, errorFile);
                    }
                    else {
                        createEntry(flags, exists, isFolder, createAndReturnFolder, returnFolder, errorFolder);
                    }
                };
                this.storage_item.getItemAsync(name).done(function (item) {
                    //console.log("found item: " + item);
                    // if (item == null) {
                    //     console.log(`could not get file ${name}`);
                    //     process(false, null);
                    // }
                    process(true, item);
                }, function (err) {
                    console.log("err " + err.message);
                    process(false, null);
                });
            };
            WinRTDirEntry.prototype.getFile = function (name, flags, callback) {
                this.getItem(name, "file", flags, callback);
            };
            WinRTDirEntry.prototype.getDirectory = function (name, flags, callback) {
                this.getItem(name, "dir", flags, callback);
            };
            return WinRTDirEntry;
        }(WinRTEntry));
        function scratchpad(name) {
        }
        fs_1.scratchpad = scratchpad;
        // TODO: replace basename with _basename
        var NodeEntry = (function () {
            function NodeEntry(filename, parent_path, parent_full_path) {
                var path_mod = require('path');
                // The private full path from the root to the file in the real local filesystem.
                // This is required because all file operations in nw uses the full local path.
                this.full_path = path_mod.join(parent_full_path, filename);
                this.basename = path_mod.basename(this.full_path);
            }
            NodeEntry.prototype.isDirectory = function () {
                var fs = require('fs');
                var stats = fs.statSync(this.full_path);
                if (stats.isDirectory()) {
                    return true;
                }
                else {
                    return false;
                }
            };
            NodeEntry.prototype.isFile = function () {
                var fs = require('fs');
                var stats = fs.statSync(this.full_path);
                if (stats.isFile()) {
                    return true;
                }
                else {
                    return false;
                }
            };
            NodeEntry.prototype.get_base_name = function () {
                return this.basename;
            };
            NodeEntry.prototype.get_full_path = function () {
                return this.full_path;
            };
            NodeEntry.prototype.getParentDirectory = function () {
                var p = require('path');
                var dirname = p.dirname(this.full_path);
                return Promise.resolve(new NodeDirEntry(p.basename(dirname), p.dirname(dirname), p.dirname(dirname)));
            };
            return NodeEntry;
        }());
        var NodeFileEntry = (function (_super) {
            __extends(NodeFileEntry, _super);
            function NodeFileEntry(filename, parent_path, parent_full_path) {
                _super.call(this, filename, parent_path, parent_full_path);
            }
            NodeFileEntry.prototype.file = function (success_cb, error_cb) {
                var fs = require('fs');
                fs.readFile(this.full_path, function (e, data) {
                    var blob = new Blob([new Uint8Array(data)]);
                    success_cb(blob);
                });
            };
            NodeFileEntry.prototype.write = function (blob, callback) {
                var _this = this;
                var writeData = function (buffer) {
                    var fs = require('fs');
                    fs.open(_this.full_path, 'w', function (err, fd) {
                        if (err != null) {
                            console.debug(err);
                        }
                        else {
                            fs.write(fd, buffer, 0, buffer.length, 0, function (err, written, buffer) {
                                if (err != null) {
                                    console.debug(err);
                                }
                                else {
                                    console.debug("it seems the data was written properly :)");
                                    callback();
                                }
                            });
                        }
                    });
                };
                var reader = new FileReader();
                reader.onload = function () {
                    var buffer = new Buffer(new Uint8Array(this.result));
                    writeData(buffer);
                };
                reader.readAsArrayBuffer(blob);
            };
            return NodeFileEntry;
        }(NodeEntry));
        fs_1.NodeFileEntry = NodeFileEntry;
        var NodeDirEntry = (function (_super) {
            __extends(NodeDirEntry, _super);
            function NodeDirEntry(dirname, parent_path, parent_full_path) {
                _super.call(this, dirname, parent_path, parent_full_path);
            }
            NodeDirEntry.prototype.getChildren = function (cb) {
                var _this = this;
                var fs = require('fs');
                //console.log(fs);
                fs.readdir(this.full_path, function (err, files) {
                    // @files contains the plain file names of the children; we need to make these into fileEntry's
                    console.log(files);
                    console.log("files");
                    var child_list = [];
                    files.forEach(function (val, index) {
                        var stats = fs.statSync(_this.full_path);
                        if (stats.isFile()) {
                            var file_entry = new NodeFileEntry(val, _this.full_path, _this.full_path);
                            child_list.push(file_entry);
                        }
                        else if (stats.isDirectory()) {
                            var dir_entry = new NodeDirEntry(val, _this.full_path, _this.full_path);
                            child_list.push(dir_entry);
                        }
                    });
                    cb(child_list);
                });
            };
            NodeDirEntry.prototype.getFile = function (name, flags, callback) {
                var _this = this;
                if (typeof flags == 'undefined' || flags == null) {
                    flags = {
                        create: false,
                        exclusive: false
                    };
                }
                var fs = require('fs');
                var path = require('path');
                var file_path = path.join(this.full_path, name);
                var stat = fs.stat(file_path, function (err, stats) {
                    var exists = null;
                    if (err != null) {
                        if (err.code == "ENOENT") {
                            exists = false;
                        }
                        else {
                            callback(null, new Error("Could not stat path " + file_path + ": " + err.message));
                        }
                    }
                    var return_file = function () {
                        callback(new NodeFileEntry(name, _this.full_path, _this.full_path), null);
                    };
                    var create_and_return_file = function () {
                        fs.open(file_path, 'w', function (err, fd) {
                            if (err) {
                                callback(null, Error("Could not create " + file_path + ": " + err.message));
                                return;
                            }
                            fs.close(fd);
                            return_file();
                        });
                    };
                    var is_file = function () {
                        return stats.isFile();
                    };
                    var error = function (e) {
                        switch (e) {
                            case "EEXIST":
                                callback(null, new Error(file_path + " already exists and the exclusive flag is set."));
                                break;
                            case "ENEXIST":
                                callback(null, new Error(file_path + " does not exist and create flag is not set."));
                                break;
                            case "ETYPE":
                                callback(null, new Error(file_path + " is a directory."));
                                break;
                        }
                    };
                    createEntry(flags, exists, is_file, create_and_return_file, return_file, error);
                });
            };
            NodeDirEntry.prototype.getDirectory = function (name, flags, callback) {
                var _this = this;
                if (typeof flags == 'undefined') {
                    flags = {
                        create: false,
                        exclusive: false
                    };
                }
                var fs = require('fs');
                var path = require('path');
                var file_path = path.join(this.full_path, name);
                var stat = fs.stat(file_path, function (err, stats) {
                    var exists = null;
                    if (err != null) {
                        if (err.code == "ENOENT") {
                            exists = false;
                        }
                        else {
                            callback(null, new Error("Could not stat path " + file_path + ": " + err.message));
                        }
                    }
                    var return_dir = function () {
                        callback(new NodeDirEntry(name, _this.full_path, _this.full_path));
                    };
                    function create_and_return_dir() {
                        fs.mkdir(file_path, function (err) {
                            if (err) {
                                callback(null, Error("Could not create " + file_path + ": " + err.message));
                                return;
                            }
                            return_dir();
                        });
                    }
                    var is_directory = function () {
                        return stats.isDirectory();
                    };
                    var error = function (e) {
                        switch (e) {
                            case "EEXIST":
                                callback(null, new Error(file_path + " already exists and the exclusive flag is set."));
                                break;
                            case "ENEXIST":
                                callback(null, new Error(file_path + " does not exist and create flag is not set."));
                                break;
                            case "ETYPE":
                                callback(null, new Error(file_path + " is a file."));
                                break;
                        }
                    };
                    createEntry(flags, exists, is_directory, create_and_return_dir, return_dir, error);
                });
            };
            return NodeDirEntry;
        }(NodeEntry));
        function chooseEntryNW(chooser_type, success, failure) {
            var chooser = document.createElement('input');
            chooser.setAttribute('type', 'file');
            if (chooser_type == "directory") {
                chooser.setAttribute('nwdirectory', '');
            }
            $(chooser).change(function (ev) {
                var fs = require('fs');
                var path = require('path');
                var file_path = chooser.value;
                var basename = path.basename(file_path);
                var parent_path = path.dirname(file_path);
                if (chooser_type == 'directory') {
                    var dir_entry = new NodeDirEntry(basename, undefined, parent_path);
                    success(dir_entry);
                }
                else if (chooser_type == 'file') {
                    var file_entry = new NodeFileEntry(basename, undefined, parent_path);
                    success(file_entry);
                }
            });
            chooser.click();
        }
        function chooseEntryWinRT(chooser_type, success, failure) {
            if (chooser_type == 'directory') {
                var dirPicker = new Windows.Storage.Pickers.FolderPicker();
                dirPicker.fileTypeFilter.replaceAll(["*"]);
                dirPicker.pickSingleFolderAsync().done(function (folder) {
                    if (folder == null)
                        return;
                    success(new WinRTDirEntry(folder));
                }, failure);
            }
            else if (chooser_type == 'file') {
                var filePicker = new Windows.Storage.Pickers.FileOpenPicker();
                filePicker.fileTypeFilter.replaceAll(["*"]);
                filePicker.pickSingleFileAsync().done(function (file) {
                    if (file == null)
                        return;
                    success(new WinRTFileEntry(file));
                }, failure);
            }
            else {
                throw new Error('chooser_type has to be "file" or "directory"');
            }
        }
        function openFileWithSystemDefaultNW(file) {
            if (Platform.platform === 'node-webkit') {
                var gui = require('nw.gui');
                var nw_entry = file;
                gui.Shell.openItem(nw_entry.get_full_path());
            }
        }
        Windows.System.Launcher.launchUriAsync;
        function openFileWithSystemDefaultWinRT(file) {
            if (file.isFile()) {
                var winrt_file_entry = file;
                Windows.System.Launcher.launchFileAsync(winrt_file_entry.getStorageItem());
            }
            else if (file.isDirectory()) {
                var winrt_dir_entry = file;
                Windows.System.Launcher.launchFolderAsync(winrt_dir_entry.getStorageItem());
            }
        }
        function openURLWithSystemDefaultWinRT(url) {
            Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(url));
        }
        function appDataDirNW(callback) {
            var gui = require('nw.gui');
            var path = require('path');
            var fs = require('fs');
            var data_dir = path.join(gui.App.dataPath, "appdata");
            fs.mkdir(data_dir, function (err) {
                if (err != null) {
                    if (err.code == "EEXIST") {
                        console.log("Data directory already exists");
                    }
                    else {
                        console.debug(err);
                        return;
                    }
                }
                else {
                    console.debug("Created " + data_dir);
                }
            });
            var basename = path.basename(data_dir);
            var parent_full_path = path.dirname(data_dir);
            callback(new NodeDirEntry(basename, undefined, parent_full_path));
        }
        function appDataDirWinRT(callback) {
            callback(new WinRTDirEntry(Windows.Storage.ApplicationData.current.localFolder));
        }
        function retainEntryNW(entry) {
            return JSON.stringify([entry.get_full_path(), entry.get_base_name()]);
        }
        function retainEntryWinRT(entry) {
            return Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.add(entry.getStorageItem());
        }
        function restoreEntryNW(id, success, failure) {
            var fs = require('fs');
            var path = require('path');
            try {
                var id_arr = JSON.parse(id);
            }
            catch (e) {
                failure(e);
                return;
            }
            var full_parent_path = path.dirname(id_arr[0]);
            var root_parent_path = id_arr[1];
            var basename = path.basename(id_arr[0]);
            try {
                var stat = fs.statSync(full_parent_path);
            }
            catch (e) {
                //            console.error(e.message);
                failure(e);
                return;
            }
            if (stat.isFile()) {
                success(new NodeFileEntry(basename, root_parent_path, full_parent_path));
            }
            else if (stat.isDirectory()) {
                success(new NodeDirEntry(basename, root_parent_path, full_parent_path));
            }
        }
        function restoreEntryWinRT(id, success, failure) {
            Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.getItemAsync(id).done(function (storageItem) {
                if (storageItem.isOfType(Windows.Storage.StorageItemTypes.file)) {
                    success(new WinRTFileEntry(storageItem));
                }
                else if (storageItem.isOfType(Windows.Storage.StorageItemTypes.folder)) {
                    success(new WinRTDirEntry(storageItem));
                }
            }, function (err) {
                failure(new Error("Could not restore entry: " + err.message));
            });
        }
    })(fs = Platform.fs || (Platform.fs = {}));
})(Platform || (Platform = {}));
