angular.module("violationreporting").run(["$rootScope", "$state", "$meteor",
  function($rootScope, $state, $meteor) {

    $rootScope.$on("$stateChangeError", function(event, next, previous, error) {
      // We can catch the error thrown when the $requireUser promise is rejected
      // and redirect the user back to the main page
      if (error === "AUTH_REQUIRED") {
        $state.go("/reports");
      }
    });

  }
]);

angular.module("violationreporting").config(['$urlRouterProvider', '$stateProvider', '$locationProvider',
  function ($urlRouterProvider, $stateProvider, $locationProvider) {

    $locationProvider.html5Mode(true);

    $stateProvider
      .state('reports', {
        url: '/reports',
        templateUrl: 'client/views/reports.ng.html',
        controller: 'ReportsCtrl'
      })
      .state('report', {
        url: '/reports/:reportID',
        templateUrl: 'client/views/report.ng.html',
        controller: 'ReportCtrl'
      });

    $urlRouterProvider.otherwise("/reports");
  }]);
