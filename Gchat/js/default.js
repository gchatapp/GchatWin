// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";
    // Uncomment the following line to enable first chance exceptions.
    //Debug.enableFirstChanceException(true);

    var app = WinJS.Application;

    var homePage;

    WinJS.Namespace.define("Kupo", {
        LaunchParameters: {
            searchQuery: null,
            shareOperation: null,
            arguments: null
        }
    });

    app.onactivated = function (e) {
        if (e.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.launch) {
            if (e.detail.previousExecutionState !== Windows.ApplicationModel.Activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize 
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension. 
                // Restore application state here.
            }
            Kupo.LaunchParameters.arguments = e.detail.arguments;
        } else if (e.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.shareTarget) {
            Kupo.LaunchParameters.shareOperation = e.detail.shareOperation;
            WinJS.Navigation.navigate(homePage);
        } else if (e.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.search) {
            Kupo.LaunchParameters.searchQuery = e.detail.queryText;
        }

        WinJS.UI.processAll();
    };

    app.oncheckpoint = function (eventObject) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the 
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // eventObject.setPromise(). 
    };

    app.onnavigated = function (eventObject) {
        WinJS.UI.Fragments.clone(e.detail.location, e.detail.state)
            .then(function (frag) {
                var host = document.getElementById('contentHost');
                host.innerHTML = '';
                host.appendChild(frag);
                document.body.focus();

                var backButton = document.querySelector('header[role=banner] .win-backbutton');
                if (backButton) {
                    backButton.addEventListener('click', function () {
                        WinJS.Navigation.back();
                    }, false);
                    if (WinJS.Navigation.canGoBack) {
                        backButton.removeAttribute('disabled');
                    }
                    else {
                        backButton.setAttribute('disabled', 'true');
                    }
                }
                WinJS.Application.queueEvent({ type: 'fragmentappended', location: e.detail.location, fragment: host, state: e.detail.state });
            });
    };

    app.start();
})();