
'use strict'

$("document").ready(function () {
    // Debugging UI - enable in index.html too
    // $("#start-button").click(main);
    // $("#platform-button").click(Platform.init);
    // $("#clear-button").click(window.localStorage.clear);

    main();
});

let controller: Controller;
function main() {
	Platform.init();
    controller = new Controller();
}

// Debugging UI - enable in index.html too.
// function printDebug (str: string) {
//     let $deb = $("#debug");
//     $deb.append($("<br>"));
//     $deb.append(str);
// }

function foo() {
    controller.app_data_dir.getFile('out', { create: true, exclusive: false }, function (file, err) {
        if (err) {
            console.log(err);
            return;
        }
        file.write(new Blob([JSON.stringify(controller.movie_list)]), function () {
            console.log('wrote file');
        });
    })
}