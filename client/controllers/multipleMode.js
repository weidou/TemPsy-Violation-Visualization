angular.module("violationreporting").controller("MultipleModeCtrl", ['$scope', '$meteor', '$rootScope',
  function($scope, $meteor, $rootScope) {

    // $scope.violationIndex = "1";
    // $scope.relatedIndex = "1";

    $scope.eventsCount = 1000000;

    $scope.range = 100;
    $scope.zoomRange = 2;
    $scope.zoomStartIndex = 99;
    $scope.zoomEndIndex = 102;

    $scope.violations = $rootScope.getReactively('violations');
    $scope.violationTypes = $meteor.collection(ViolationTypes).subscribe('violationtypes');

    $scope.violationSources = [];
    $scope.violationDestinations = [];

    $scope.ignoreZoomed = false;

    $scope.zoom = function(event) {
      event.chart.zoomToIndexes($scope.zoomStartIndex, $scope.zoomEndIndex);
    }

    $scope.plot = function(chart, index) {
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
            x.constant = 10;
            plotData.push(x);
          });
          chart.dataProvider = plotData;
          $scope.ignoreZoomed = true;
          chart.validateData();
        },
        function(err) {
          console.log('loading data failed', err);
        }
      );
    }

    // $scope.isInt = function (value) {
    //   return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value));
    // };


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

      var indices = _.union(violation.causes, violation.effects);
      var i = 0;
      _.each(indices, function(index) {
        var plotID = "plot"+i;
        $scope[plotID] = AmCharts.makeChart(plotID, {
          "type": "serial",
          "theme": "light",
          "pathToImages": "http://www.amcharts.com/lib/3/images/",
          "valueAxes": [{
            "axisAlpha": 0,
            "dashLength": 1,
            "position": "left",
            "labelsEnabled": false
          }],
          "chartCursor": {
            "cursorPosition": "mouse",
            // "pan": true,
            // "categoryBalloonDateFormat": "JJ:NN:SS:QQ",
          },
          "export": {
            "enabled": false
          },
          "dataProvider": [],
          // "dataDateFormat": "JJ:NN:SS:QQ",
          "categoryField": "index",
          "categoryAxis": {
            "parseDates": false,
            // "minPeriod": "1fff",
            // "inside": true,
            "axisColor": "#DADADA",
            "dashLength": 1,
            "minorGridEnabled": true,
            "gridAlpha": 0.07,
            "labelRotation": 45,
            "labelOffset": 10,
            // "dateFormats": [{
            //     "period": 'fff',
            //     "format": 'JJ:NN:SS'
            // }, {
            //     "period": 'ss',
            //     "format": 'JJ:NN:SS'
            // }, {
            //     "period": 'mm',
            //     "format": 'JJ:NN:SS'
            // }, {
            //     "period": 'hh',
            //     "format": 'JJ:NN:SS'
            // }, {
            //     "period": 'DD',
            //     "format": 'MMM DD'
            // }, {
            //     "period": 'WW',
            //     "format": 'MMM DD'
            // }, {
            //     "period": 'MM',
            //     "format": 'MMM YYYY'
            // }, {
            //     "period": 'YYYY',
            //     "format": 'MMM YYYY'
            // }],
            // "position": "top"
          },
          "graphs": [{
            "id": "g",
            "balloonText": "<b><span style='font-size:14px;'>index: [[index]]</span></b><br/><b><span style='font-size:14px;'>event: [[event]]</span></b><br/><b><span style='font-size:14px;'>timestamp: [[timestamp]]</span></b>",
            "bullet": "round",
            "bulletBorderAlpha": 0.4,
            // "bulletColor": "#FFFFFF",
            "bulletSize": 10,
            "colorField": "color",
            "hideBulletsCount": 50,
            "title": "violations",
            "lineThickness": 2,
            "valueField": "constant",
            "useLineColorForBulletBorder": true
          }],
          "chartScrollbar": {
            // "autoGridCount": true,
            // "graph": "g",
            // "scrollbarHeight": 40
          },
          "creditsPosition": "bottom-right"
        });

        $scope[plotID].addListener("dataUpdated", $scope.zoom);
        $scope[plotID].addListener("zoomed", function(event) {
          if ($scope.ignoreZoomed) {
            $scope.ignoreZoomed = false;
            return;
          }
          $scope.zoomStartIndex = event.startIndex;
          $scope.zoomEndIndex = event.endIndex;
        });

        $scope.plot($scope[plotID], indices[i]);
        i = i+1;
      });
    };

  }
]);
