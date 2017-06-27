(function() {
    "use strict";
    function NoNodesController($scope, $http, deploySignalrService, deployHelper) {
        var vm = this;
        var baseUrl = Umbraco.Sys.ServerVariables.umbracoUrls.deployNoNodesBaseUrl;

        vm.restore = {};
        vm.logIsvisible = false;
        vm.restoreData = restoreData;
        vm.restoreSchema = restoreSchema; 
        vm.showLog = showLog;
        vm.isDebug = Umbraco.Sys.ServerVariables.deploy.DebugEnabled;

        function restoreSchema() {
            $http.post(baseUrl + 'CreateDiskReadTrigger')
                .then(function(response) {
                    vm.restore.status = "";
                });
        }

        function checkBusy() {

            if (vm.isDebug) return;

            $http.get(baseUrl + 'IsBusy')
                .then(function(response) {
                    vm.restore.status = "ready";
                });
        }

        function restoreData() {
            var data = {
                SourceUrl: Umbraco.Sys.ServerVariables.deploy.Target.Url
            };
            return $http.post(baseUrl + 'Restore', data)
                .then(function(response) {
                        vm.step = "restoreWebsite";
                    },
                    function (response) {
                        vm.restore = {
                            'error': {
                                hasError: true,
                                exceptionMessage: response.data.ExceptionMessage,
                                log: response.data.StackTrace,
                                exception: response.data.Exception
                            }
                        };

                        // fetch the inner exception that actually makes sense to show in the UI.
                        // AggregateException and RemoteApiException are completely non-saying about what the problem is
                        // so we should try to get the inner exception instead and use that for displaying errors.
                        while ((vm.restore.error.exception.ClassName === 'System.AggregateException' ||
                                vm.restore.error.exception.ClassName === 'Umbraco.Deploy.Exceptions.RemoteApiException' ||
                                vm.restore.error.exception.ClassName === 'System.Net.Http.HttpRequestException') &&
                            vm.restore.error.exception.InnerException !== null) {
                            vm.restore.error.exception = vm.restore.error.exception.InnerException;
                        }

                    });
        };

        function showLog() {
            vm.logIsvisible = true;
        }

        function onInit() {
            resetRestore();
            setTimeout(function() {
                checkBusy();
                $scope.$apply();
            }, 1000);
        }

        function resetRestore() {
            vm.restore = {
                'restoreProgress': 0,
                'currentActivity': '',
                'status': '',
                'error': {}
            };
        }

        function updateRestoreArgs(event, args) {
            vm.restore.restoreProgress = args.percent;
            vm.restore.currentActivity = args.comment;
            var status = deployHelper.getStatusValue(args.status);

            if (status === 'failed' ||
                status === 'cancelled' ||
                status === 'timedOut') {
                vm.restore.error = {
                    hasError: true,
                    comment: args.comment,
                    log: args.log,
                    exception: args.exception
                };

                // fetch the inner exception that actually makes sense to show in the UI.
                // AggregateException and RemoteApiException are completely non-saying about what the problem is
                // so we should try to get the inner exception instead and use that for displaying errors.
                while ((vm.restore.error.exception.ClassName === 'System.AggregateException' ||
                        vm.restore.error.exception.ClassName === 'Umbraco.Deploy.Exceptions.RemoteApiException') &&
                    vm.restore.error.exception.InnerException !== null) {
                    vm.restore.error.exception = vm.restore.error.exception.InnerException;
                }
            }

            return status;
        }

        //listen for the restore data
        $scope.$on('restore:sessionUpdated',
            function(event, args) {
                $scope.$apply(function() {
                    vm.restore.status = updateRestoreArgs(event, args);
                });
            });

        //listen for the schema data to complete - this deployments starts on a background thread as soon as the site
        //starts up so it may already be done before this, otherwise we can determine when it finishes
        $scope.$on('restore:diskReadSessionUpdated',
            function (event, args) {
                $scope.$apply(function () {
                    var status = updateRestoreArgs(event, args);

                    if (status === "completed") {
                        vm.restore.status = "ready";
                    }
                });
            });

        onInit();
    }
    angular.module("umbraco.nonodes").controller("Umbraco.NoNodes.Controller", NoNodesController);
})();