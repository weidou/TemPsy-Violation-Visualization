angular.module("violationreporting").controller("ReportsCtrl", ['$scope', '$meteor',
  function($scope, $meteor) {

    $scope.page = 1;
    $scope.perPage = 5;
    $scope.sort = { trace: 1 };

    $scope.reports = $meteor.collection(function() {
      return Reports.find({}, {
        sort : $scope.getReactively('sort')
      });
    });

    $meteor.autorun($scope, function() {
      $meteor.subscribe('reports', {
        limit: parseInt($scope.getReactively('perPage')),
        skip: (parseInt($scope.getReactively('page')) - 1) * parseInt($scope.getReactively('perPage')),
        sort: $scope.getReactively('sort')
      }, $scope.getReactively('search')).then(function() {
        $scope.reportsCount = $meteor.object(Counts ,'numberOfReports', false);
      });
    });

    $scope.number = function(violationsList) {
      return _.reduce(violationsList, function(count, value) {
        if(_.isEmpty(value.violations)) {
          return count + 1;
        } else {
          return count + value.violations.length;
        }
      }, 0);
    }

    $scope.pageChanged = function(newPage) {
      $scope.page = newPage;
    };

    $scope.remove = function(report) {
      $scope.reports.remove(report);
    };
  }
]);
