angular.module("violationreporting").controller("SingleModeCtrl", ['$scope', '$meteor', '$rootScope',
  function($scope, $meteor, $rootScope) {

    // $scope.violationIndex = "1";
    // $scope.relatedIndex = "1";

    $scope.range = 50;
    $scope.eventsCount = 1000000;

    $scope.plotData = [];

    $scope.ignoreZoomed = false;

    $scope.zoomRange = 15;
    $scope.zoomStartIndex = 35;
    $scope.zoomEndIndex = 64;

    $scope.violations = $rootScope.getReactively('violations');
    $scope.violationTypes = $meteor.collection(ViolationTypes).subscribe('violationtypes');


    $scope.violationSources = [];
    $scope.violationDestinations = [];

    $scope.zoom = function() {
      $scope.chart.zoomToIndexes($scope.zoomStartIndex, $scope.zoomEndIndex);
    }

    $scope.loadData = function(index) {
      $meteor.call(
        'loadData',
        'pre11exactly1000000',
        Math.max(0, index - $scope.range + 1),
        Math.min(index + $scope.range, $scope.eventsCount),
        $scope.range * 2
      ).then(
        function(data) {
          var plotData = [];
          var x;
          _.each(data, function(o) {
            x = o['_source'];
            if (_.contains($scope.violationSources, x.index))
              x.color = "#CC3300";
            else
            if (_.contains($scope.violationDestinations, x.index))
              x.color = "#008A00";
            else
              x.color = "#FFFFFF";
            plotData.push(x);
          });
          $scope.chart.dataProvider = plotData;
          $scope.ignoreZoomed = true;
          $scope.chart.validateData();
        },
        function(err) {
          console.log('loading data failed', err);
        }
      );
    }

    $scope.handleClick = function(event) {
      var index = parseInt(event.item.category);
      var backup = index;
      if (_.contains($scope.violationSources, index)) {
        if (_.isEmpty($scope.violationDestinations))
          index = backup;
        else
          index = $scope.violationDestinations[0];
      } else {
        if (_.contains($scope.violationDestinations, index)) {
          var destIndex = _.indexOf($scope.violationDestinations, index);
          if (destIndex + 1 < $scope.violationDestinations.length) {
            index = $scope.violationDestinations[destIndex + 1];
          } else {
            index = $scope.violationSources[0];
          }
        } else {
          index = backup;
        }
      }

      if (index === backup) return;

      $scope.zoomToIndex(index);
    };

    $scope.chart = AmCharts.makeChart("plot", {
      "type": "serial",
      "theme": "light",
      "pathToImages": "http://www.amcharts.com/lib/3/images/",
      "valueAxes": [{
        "axisAlpha": 0,
        "dashLength": 1,
        "position": "left"
      }],
      "chartCursor": {
        "cursorPosition": "mouse"
      },
      "export": {
        "enabled": false
      },
      "dataProvider": [],
      "categoryField": "index",
      "categoryAxis": {
        "parseDates": false,
        "axisColor": "#DADADA",
        "dashLength": 1,
        "minorGridEnabled": true,
        // "position": "top"
      },
      "graphs": [{
        "id": "g1",
        "balloonText": "<b><span style='font-size:14px;'>index: [[index]]</span></b><br/><b><span style='font-size:14px;'>event: [[event]]</span></b><br/><b><span style='font-size:14px;'>timestamp: [[timestamp]]</span></b>",
        "bullet": "round",
        "bulletBorderAlpha": 0.4,
        // "bulletColor": "#FFFFFF",
        "bulletSize": 10,
        "colorField": "color",
        "hideBulletsCount": 50,
        "title": "violations",
        "lineThickness": 2,
        "valueField": "timestamp",
        "useLineColorForBulletBorder": true
      }],
      "chartScrollbar": {
        "autoGridCount": true,
        "graph": "g1",
        "scrollbarHeight": 40
      },
      "creditsPosition": "bottom-right"
    });

    $scope.chart.addListener("dataUpdated", $scope.zoom);

    $scope.chart.addListener("zoomed", function(event) {
      if ($scope.ignoreZoomed) {
        $scope.ignoreZoomed = false;
        return;
      }
      $scope.zoomStartIndex = event.startIndex;
      $scope.zoomEndIndex = event.endIndex;
    });

    $scope.chart.addListener("clickGraphItem", $scope.handleClick);

    // $scope.isInt = function (value) {
    //   return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value));
    // };

    $scope.pageChanged = function(newPageNumber) {
      $scope.page = newPageNumber;
    };

    $scope.zoomToIndex = function(index) {
      if (_.isEmpty($scope.chart.dataProvider))
        return;
      var startIndex = $scope.chart.dataProvider[0].index;
      var endIndex = $scope.chart.dataProvider[$scope.chart.dataProvider.length - 1].index;

      if (startIndex < index && index < endIndex) {
        var indexes = _.map($scope.chart.dataProvider, function(data) {
          return data.index;
        });
        var plotIndex = _.indexOf(indexes, index);
        $scope.zoomStartIndex = Math.max(0, plotIndex - $scope.zoomRange + 1);
        $scope.zoomEndIndex = Math.min(plotIndex + $scope.zoomRange, $scope.chart.dataProvider.length - 1);
        $scope.zoom();
      } else {
        $scope.loadData(index);
      }
    };

    $scope.plotViolation = function(violation) {
      // var indices = _.union(violation.causes, violation.effects);
      // var array = _.range(_.union(violation.causes, violation.effects).length);

      switch (violation.pattern) {
        case "precedence":
          switch (violation.type) {
            case "NSOR":
              $scope.violationSources = violation.effects;
              $scope.violationDestinations = [];
              break;
            default:
              $scope.violationSources = violation.effects;
              $scope.violationDestinations = violation.causes;
          }
          break;
        default:
          $scope.violationSources = [];
          $scope.violationDestinations = [];
      }

      $scope.loadData($scope.violationSources[0]);
    };

  }
]);
