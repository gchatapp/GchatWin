// For an introduction to the Split template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=232447
(function () {
    "use strict";

    WinJS.Namespace.define("Kupo", {
        LaunchParameters: {
            searchQuery: null,
            shareOperation: null,
            arguments: null
        }
    });

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;
    WinJS.strictProcessing();

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }

            Kupo.LaunchParameters.arguments = args.detail.arguments;

            if (app.sessionState.history) {
                nav.history = app.sessionState.history;
            }
            args.setPromise(WinJS.UI.processAll().then(function () {
                if (nav.location) {
                    nav.history.current.initialPlaceholder = true;
                    return nav.navigate(nav.location, nav.state);
                } else {
                    return nav.navigate(Application.navigator.home);
                }
            }));
        } else if (e.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.shareTarget) {
            Kupo.LaunchParameters.shareOperation = args.detail.shareOperation;
            WinJS.Navigation.navigate(homePage);
        } else if (e.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.search) {
            Kupo.LaunchParameters.searchQuery = args.detail.queryText;
        }
    });

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. If you need to 
        // complete an asynchronous operation before your application is 
        // suspended, call args.setPromise().
        app.sessionState.history = nav.history;
    };

    app.start();
})();
