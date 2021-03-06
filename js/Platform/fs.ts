namespace Platform.fs {


        export function init () {
            if (Platform.platform == 'WinRT') {
                chooseEntry = chooseEntryWinRT;
                openFileWithSystemDefault = openFileWithSystemDefaultWinRT;
                openURLWithSystemDefault = openURLWithSystemDefaultWinRT;
                appDataDir = appDataDirWinRT;
                retainEntry = retainEntryWinRT;
                restoreEntry = restoreEntryWinRT;
            } else if (Platform.platform == 'node-webkit') {
                chooseEntry = chooseEntryNW;
                openFileWithSystemDefault = openFileWithSystemDefaultNW;
                appDataDir = appDataDirNW;
                retainEntry = retainEntryNW;
                restoreEntry = restoreEntryNW;
            } else if (Platform.platform == 'electron') {
                chooseEntry = chooseEntryElectron;
                appDataDir = appDataDirElectron;
                retainEntry = retainEntryNW;
                restoreEntry = restoreEntryNW;
                openFileWithSystemDefault = openFileWithSystemDefaultElectron;
                openURLWithSystemDefault = openURLWithSystemDefaultElectron;
            }
        }


        export interface ICreateFlags {
            create: boolean;
            exclusive?: boolean;
        }

        export interface Entry {
            isDirectory(): boolean;
            isFile(): boolean;
            get_base_name(): string;
            //get_full_path(): string;
            getParentDirectory(): Promise<DirEntry>;
        }

        export interface FileEntry extends Entry {
            file(success_cb: (blob: Blob) => void, error_cb: (err: Error) => void);
            write(blob: Blob, callback: Function);
        }

        export interface DirEntry extends Entry {
            getChildren(cb: (child_list: Entry[]) => any): void;
            getFile(name: string, flags: ICreateFlags, callback: (res: FileEntry, e: Error) => void): void;
            getDirectory(name: string, flags: ICreateFlags, callback: (res: DirEntry) => void): void;
        }


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
        function createEntry (
            flags: ICreateFlags,
            exists: boolean,
            isType: () => boolean,
            createAndReturnItem: () => void,
            returnItem: () => void,
            error: (e: "EEXIST"|"ETYPE"|"ENEXIST") => void
        ) {
            if (flags.create) {
                if (!exists) {
                    createAndReturnItem();
                } else {
                    if (flags.exclusive) {
                        error("EEXIST");
                    } else {
                        if (!isType) {
                            error("ETYPE")
                        } else {
                            returnItem();
                        }
                    }
                }
            } else {
                if (!exists) {
                    error("ENEXIST");
                } else {
                    if (!isType) {
                        error("ETYPE");
                    } else {
                        returnItem();
                    }
                }
            }
        }


        abstract class WinRTEntry implements Entry {

            protected storage_item: Windows.Storage.IStorageItem = null;

            constructor (_storage_item : Windows.Storage.IStorageItem) {
                if (!_storage_item)
                    throw new Error("Cannot create entry: storage item is null or undefined");
                this.storage_item = _storage_item;
            }

            isDirectory(): boolean {
                return this.storage_item.isOfType(Windows.Storage.StorageItemTypes.folder) ;
            }

            isFile(): boolean {
                return this.storage_item.isOfType(Windows.Storage.StorageItemTypes.file) ;
            }

            get_base_name(): string {
                return this.storage_item.name;
            }

            get_full_path(): string {
                return this.storage_item.path;
            }

            getParentDirectory(): Promise<WinRTDirEntry> {
                return new Promise<WinRTDirEntry>((resolve, reject) => {
                    this.storage_item.getParentAsync().done((parent) => {
                        if (parent)
                            resolve(new WinRTDirEntry(parent));
                        else
                            reject(new Error("Could not get parent folder for " + this.storage_item.name));
                    }, reject);
                });
            }

            /**
             * Ugly hack to allow access to the native file for passing to other WinRT APIs.
             * It's okay as long as this class is not exported.
             */
            getStorageItem (): Windows.Storage.IStorageItem {
                return this.storage_item;
            }

        }


        class WinRTFileEntry extends WinRTEntry implements FileEntry {

            protected storage_item: Windows.Storage.StorageFile;

            constructor (file: Windows.Storage.StorageFile) {
                super(file);
            }

            public file (success_cb: (blob: Blob) => void, error_cb: (err: Error) => void) {
                Windows.Storage.FileIO.readBufferAsync(this.storage_item).then((buffer) => {
                    let dataReader = Windows.Storage.Streams.DataReader.fromBuffer(buffer);
                    let bytes = new Uint8Array(buffer.length);
                    dataReader.readBytes(bytes);
                    dataReader.close();
                    success_cb(new Blob([bytes]));
                }, (err) => {
                    error_cb(err);
                }).done(undefined, (err) => {
                    error_cb(err);
                })
            }

            public write (blob: Blob, callback: (err: Error) => void) {
                console.log(`writing file ${this.storage_item.name}`);
                var reader = new FileReader();
                reader.onloadend = (ev) => {
                    var bytes = new Uint8Array((ev.target as FileReader).result);
                    try {
                        Windows.Storage.FileIO.writeBytesAsync(this.storage_item, bytes as any).then(() => {
                            callback(null);
                        }).done(undefined, (err) => {
                            callback(err);
                        });
                    } catch (e) {
                        // console.log(e.message);
                        callback(e);
                    }

                }
                reader.onerror = (ev) => {
                    console.log(reader.error);
                }
                reader.readAsArrayBuffer(blob);
            }

            /**
             * Ugly hack to allow access to the native file for passing to other WinRT APIs.
             * It's okay as long as this class is not exported.
             */
            // getStorageFile (): Windows.Storage.StorageFile {
            //     return this.storage_item;
            // }

        }


        class WinRTDirEntry extends WinRTEntry implements DirEntry {

            protected storage_item: Windows.Storage.StorageFolder;

            constructor (dir: Windows.Storage.IStorageFolder) {
                super(dir);
            }

            public getChildren(cb: (child_list: Entry[]) => any): void {
                this.storage_item.getItemsAsync().done((itemList: Windows.Storage.IStorageItem[]) => {
                    let entryList = itemList.map((item) => {
                        if (item.isOfType(Windows.Storage.StorageItemTypes.file)) {
                            return new WinRTFileEntry(item as Windows.Storage.StorageFile);
                        } else if (item.isOfType(Windows.Storage.StorageItemTypes.folder)) {
                            return new WinRTDirEntry(item as Windows.Storage.StorageFolder);
                        }

                    });
                    cb(entryList);
                });
            }

            private getItem (name: string, itemType: "file"|"dir", flags: ICreateFlags, callback: (res: Entry, e: Error) => void): void {



                let process = (exists: boolean, item?: Windows.Storage.IStorageItem) => {

                    let createAndReturnFile = () => {
                        this.storage_item.createFileAsync(name).done((file) => {
                            callback(new WinRTFileEntry(file), null);
                        }, (e) => {
                            callback(null, e);
                        });
                    }

                    let createAndReturnFolder = () => {
                        this.storage_item.createFolderAsync(name).done((folder) => {
                            callback(new WinRTDirEntry(folder), null);
                        }, (e) => {
                            callback(null, e);
                        });
                    }

                    let returnFile = () => {
                        callback(new WinRTFileEntry(item as Windows.Storage.StorageFile), null);
                    }

                    let returnFolder = () => {
                        callback(new WinRTDirEntry(item as Windows.Storage.StorageFolder), null);
                    }

                    let isFile = () => {
                        return item.isOfType(Windows.Storage.StorageItemTypes.file);
                    }

                    let isFolder = () => {
                        return item.isOfType(Windows.Storage.StorageItemTypes.folder);
                    }

                    let errorFile = (e) => {
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
                    }

                    let errorFolder = (e) => {
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
                    }

                    if (itemType == "file") {
                        createEntry(flags, exists, isFile, createAndReturnFile, returnFile, errorFile);
                    } else {
                        createEntry(flags, exists, isFolder, createAndReturnFolder, returnFolder, errorFolder);
                    }



                }



                this.storage_item.getItemAsync(name).done((item) => {
                    //console.log("found item: " + item);
                    // if (item == null) {
                    //     console.log(`could not get file ${name}`);
                    //     process(false, null);
                    // }
                    process(true, item);
                }, (err) => {
                    console.log("err " + err.message);
                    process(false, null);
                });

            }

            public getFile(name: string, flags: ICreateFlags, callback: (res: FileEntry, e: Error) => void): void {
                this.getItem(name, "file", flags, callback);

            }

            public getDirectory(name: string, flags: ICreateFlags, callback: (res: DirEntry, e?: Error) => void): void {
                this.getItem(name, "dir", flags, callback);
            }

        }

        export function scratchpad (name: string) {

        }


        // TODO: replace basename with _basename
        class NodeEntry implements Entry {


            protected basename: string;

            protected full_path: string;

            constructor (filename: string, parent_path: any, parent_full_path: string) {

                var path_mod = require('path');


                // The private full path from the root to the file in the real local filesystem.
                // This is required because all file operations in nw uses the full local path.
                this.full_path = path_mod.join(parent_full_path, filename);

                this.basename = path_mod.basename(this.full_path);

            }

            public isDirectory (): boolean {

                var fs = require('fs');
                var stats = fs.statSync(this.full_path);
                if (stats.isDirectory()) {
                    return true;
                } else {
                    return false;
                }

            }

            public isFile (): boolean {

                var fs = require('fs');
                var stats = fs.statSync(this.full_path);
                if (stats.isFile()) {
                    return true;
                } else {
                    return false;
                }

            }

            public get_base_name(): string {

                return this.basename;

            }


            public get_full_path () : string {
                return this.full_path;
            }

            public getParentDirectory () : Promise<NodeDirEntry> {
                var p = require('path');
                let dirname = p.dirname(this.full_path);
                return Promise.resolve(new NodeDirEntry(p.basename(dirname), p.dirname(dirname), p.dirname(dirname)));
            }


        }


        export class NodeFileEntry extends NodeEntry implements FileEntry {


            constructor (filename: string, parent_path: any, parent_full_path: string) {

                super(filename, parent_path, parent_full_path);

            }


            public file (success_cb: (blob: Blob) => void, error_cb : (err: Error) => void) {

                var fs = require('fs');

                fs.readFile(this.full_path, function (e, data) {
                    var blob = new Blob([new Uint8Array(data)]);
                    success_cb(blob);
                });

            }


            public write (blob: Blob, callback) {

                var writeData = (buffer) => {
                    var fs = require('fs');
                    fs.open(this.full_path, 'w', function(err, fd) {
                        if (err != null) {
                            console.debug(err);
                        } else {
                            fs.write(fd, buffer, 0, buffer.length, 0, function(err, written, buffer) {
                                if (err != null) {
                                    console.debug(err);
                                } else {
                                    console.debug("it seems the data was written properly :)");
                                    callback();
                                }
                            });
                        }
                    });
                }

                var reader = new FileReader();
                reader.onload = function() {
                    var buffer = new Buffer(new Uint8Array(this.result));
                    writeData(buffer);
                }
                reader.readAsArrayBuffer(blob);

            }


        }





        class NodeDirEntry extends NodeEntry implements DirEntry {


            constructor (dirname: string, parent_path: string, parent_full_path: string) {

                super(dirname, parent_path, parent_full_path);

            }


            getChildren(cb: (child_list: Entry[]) => any): void {

                var fs = require('fs');
                //console.log(fs);

                fs.readdir(this.full_path, (err, files) => {
                    // @files contains the plain file names of the children; we need to make these into fileEntry's
                    console.log(files);
                    console.log("files");
                    var child_list = [];
                    files.forEach((val, index) => {
                        var stats = fs.statSync(this.full_path);
                        if (stats.isFile()) {
                            var file_entry = new NodeFileEntry(val, this.full_path, this.full_path);
                            child_list.push(file_entry);
                        } else if (stats.isDirectory()) {
                            var dir_entry = new NodeDirEntry(val, this.full_path, this.full_path);
                            child_list.push(dir_entry);
                        }
                    });
                    cb(child_list);
                });

            }


            getFile(name: string, flags: ICreateFlags, callback: (f: FileEntry, e: Error) => void): void {

                if (typeof flags == 'undefined' || flags == null) {
                    flags = {
                        create: false,
                        exclusive: false
                    }
                }

                var fs = require('fs');
                var path = require('path');

                var file_path = path.join(this.full_path, name);

                var stat = fs.stat(file_path, (err, stats) => {

                    let exists: boolean = true;

                    if (err != null) {
                        if (err.code == "ENOENT") {
                            exists = false;
                        } else {
                            callback(null, new Error("Could not stat path " + file_path + ": " + err.message));
                        }
                    }

                    var return_file = () => {
                        callback(new NodeFileEntry(name, this.full_path, this.full_path), null);
                    }

                    var create_and_return_file = () => {
                        fs.open(file_path, 'w', function(err, fd) {
                            if (err)  {
                                callback(null, Error(`Could not create ${file_path}: ${err.message}`));
                                return;
                            }
                            fs.close(fd);
                            return_file();
                        });
                    }

                    var is_file = () => {
                        return stats.isFile();
                    }

                    var error = (e) => {
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
                    }

                    createEntry(flags, exists, is_file, create_and_return_file, return_file, error);

                });


            }


            getDirectory (name: string, flags: ICreateFlags, callback: (d: DirEntry, e?: Error) => void): void {

                if (typeof flags == 'undefined') {
                    flags = {
                        create: false,
                        exclusive: false
                    }
                }

                var fs = require('fs');
                var path = require('path');

                var file_path = path.join(this.full_path, name);

                var stat = fs.stat(file_path, (err, stats) => {

                    let exists: boolean = null;

                    if (err != null) {
                        if (err.code == "ENOENT") {
                            exists = false;
                        } else {
                            callback(null, new Error("Could not stat path " + file_path + ": " + err.message));
                        }
                    }

                    var return_dir = () => {
                        callback(new NodeDirEntry(name, this.full_path, this.full_path));
                    }

                    function create_and_return_dir() {
                        fs.mkdir(file_path, function(err) {
                            if (err) {
                                callback(null, Error(`Could not create ${file_path}: ${err.message}`));
                                return;
                            }
                            return_dir();

                        });
                    }

                    var is_directory = () => {
                        return stats.isDirectory();
                    }

                    var error = (e) => {
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
                    }

                    createEntry(flags, exists, is_directory, create_and_return_dir, return_dir, error);

                });

            }


        }


        export let chooseEntry: (chooser_type: string, success: { (res: Entry): void }, failure) => void;

        function chooseEntryNW (chooser_type: 'file'|'directory', success: {(res: Entry): void}, failure) {

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
                } else if (chooser_type == 'file') {
                    var file_entry = new NodeFileEntry(basename, undefined, parent_path);
                    success(file_entry);
                }
            });

            chooser.click();

        }


        function chooseEntryElectron (chooser_type: 'file'|'directory', success: (res: Entry) => void, failure) {

            const dialog = require('electron').remote.dialog;
            let props = {};
            if (chooser_type === 'directory') {
                props = {"properties": ['openDirectory']};
            } else if (chooser_type === 'file') {
                props = {"properties": ['openFile']};
            }
            dialog.showOpenDialog(props, (selected) => {
                var path = require('path');
                var file_path = selected[0];
                var basename = path.basename(file_path);
                var parent_path = path.dirname(file_path);
                if (chooser_type == 'directory') {
                    var dir_entry = new NodeDirEntry(basename, undefined, parent_path);
                    success(dir_entry);
                } else if (chooser_type == 'file') {
                    var file_entry = new NodeFileEntry(basename, undefined, parent_path);
                    success(file_entry);
                }
            });

        }



        function chooseEntryWinRT (chooser_type: 'file'|'directory', success: { (res: Entry): void }, failure?: (e: Error) => void) {
            if (chooser_type == 'directory') {
                let dirPicker = new Windows.Storage.Pickers.FolderPicker();
                dirPicker.fileTypeFilter.replaceAll(["*"] as any);
                dirPicker.pickSingleFolderAsync().done((folder) => {
                    if (folder == null)
                        return;
                    success(new WinRTDirEntry(folder));
                }, failure);
            } else if (chooser_type == 'file') {
                let filePicker = new Windows.Storage.Pickers.FileOpenPicker();
                filePicker.fileTypeFilter.replaceAll(["*"] as any);
                filePicker.pickSingleFileAsync().done((file) => {
                    if (file == null)
                        return;
                    success(new WinRTFileEntry(file));
                }, failure);
            } else {
                throw new Error('chooser_type has to be "file" or "directory"');
            }
        }



        /**
         * Opens a file with the system's default app.
         *
         * @param file The file to open.
         */
        export let openFileWithSystemDefault: (file: Platform.fs.Entry) => void;

        function openFileWithSystemDefaultNW(file: Platform.fs.Entry) {
            if (Platform.platform === 'node-webkit') {
                let gui = require('nw.gui');
                let nw_entry: NodeEntry = file as NodeEntry;
                gui.Shell.openItem(nw_entry.get_full_path());
            }
        }
        
        function openFileWithSystemDefaultElectron(file: Platform.fs.Entry) {
            require('electron').shell.openItem((file as NodeEntry).get_full_path());
        }

        function openFileWithSystemDefaultWinRT(file: Platform.fs.Entry) {
            if (file.isFile()) {
                let winrt_file_entry = file as WinRTFileEntry;
                Windows.System.Launcher.launchFileAsync(winrt_file_entry.getStorageItem() as Windows.Storage.StorageFile);
            } else if (file.isDirectory()) {
                let winrt_dir_entry = file as WinRTDirEntry;
                Windows.System.Launcher.launchFolderAsync(winrt_dir_entry.getStorageItem() as Windows.Storage.StorageFolder);
            }

        }

        export let openURLWithSystemDefault: (url: string) => void;

        function openURLWithSystemDefaultWinRT (url: string) {
            Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(url));

        }
        
        function openURLWithSystemDefaultElectron (url: string) {
            require('electron').shell.openExternal(url);
        }


        /**
         * Returns a DirEntry for the applications data directory
         *
         * @param callback Called with the DirEntry for the data directory.
        */
        export let appDataDir: (callback: (d: DirEntry) => void) => void;
        
        function appDataDirNodeCommon (appDataDirPath: string, callback: (d: DirEntry) => void) {
            var path = require('path');
            var fs = require('fs');

            var data_dir: string = appDataDirPath;

            fs.mkdir(data_dir, function(err) {
                if (err) {
                    if (err.code === "EEXIST") {
                        console.log("Data directory already exists")
                    } else {
                        console.debug(err);
                        return;
                    }
                } else {
                    console.debug("Created " + data_dir);
                }
                var basename = path.basename(data_dir);
                var parent_full_path = path.dirname(data_dir);
                callback(new NodeDirEntry(basename, undefined, parent_full_path));
            });
        }

        function appDataDirNW (callback: (d: DirEntry) => void) {

            var gui = require('nw.gui');
            var path = require('path');
            var data_dir = path.join(gui.App.dataPath, "appdata");
            appDataDirNodeCommon(data_dir, callback);
        }

        function appDataDirWinRT (callback: (d: DirEntry) => void) {
                callback(new WinRTDirEntry(Windows.Storage.ApplicationData.current.localFolder));
        }

        function appDataDirElectron (callback: (d: DirEntry) => void) {
            const path = require('path');
            const data_dir = path.join(require('electron').remote.app.getPath('userData'), "appdata");
            appDataDirNodeCommon(data_dir, callback);
        }


        export let retainEntry: (entry: Entry) => any;

        function retainEntryNW (entry: Entry): string {

            return JSON.stringify([(entry as NodeEntry).get_full_path(), entry.get_base_name()]);

        }

        function retainEntryWinRT (entry: Entry): string {
            return Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.add((entry as WinRTEntry).getStorageItem());
        }



        export let restoreEntry: (id: string, success: (Entry) => void, failure: {(Error): void}) => void;

        function restoreEntryNW(id: string, success: (Entry) => void, failure: {(Error): void}) {

            var fs = require('fs');
            var path = require('path');

            try {
                var id_arr = JSON.parse(id);
            } catch (e) {
                failure(e);
                return;
            }
            var full_parent_path = path.dirname(id_arr[0]);
            var root_parent_path = id_arr[1];
            var basename = path.basename(id_arr[0]);

            try {
                var stat = fs.statSync(full_parent_path);
            } catch (e) {
    //            console.error(e.message);
                failure(e);
                return;
            }
            if (stat.isFile()) {
                success(new NodeFileEntry(basename, root_parent_path, full_parent_path));
            } else if (stat.isDirectory()) {
                success(new NodeDirEntry(basename, root_parent_path, full_parent_path));
            }

        }

        function restoreEntryWinRT (id: string, success: (e: Entry) => void, failure: {(e: Error): void}) {

            Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.getItemAsync(id).done((storageItem) => {
                if (storageItem.isOfType(Windows.Storage.StorageItemTypes.file)) {
                    success(new WinRTFileEntry(storageItem as Windows.Storage.StorageFile));
                } else if (storageItem.isOfType(Windows.Storage.StorageItemTypes.folder)) {
                    success(new WinRTDirEntry(storageItem as Windows.Storage.StorageFolder));
                }
            }, (err) => {
                failure(new Error(`Could not restore entry: ${err.message}`));
            });

        }




}
