angular.module("violationreporting").controller("HybridModeCtrl", ['$scope', '$meteor', '$rootScope',
  function($scope, $meteor, $rootScope) {

    $scope.eventsCount = 1000000;
    $scope.range = 10;

    $scope.pattern = {
      type: "precedence",
      causes: ["a"],
      distance: 600,
      effects: ["b"]
    };

    $scope.violations = $rootScope.getReactively('violations');
    $scope.violationTypes = $meteor.collection(ViolationTypes).subscribe('violationtypes');

    $scope.violationSources = [];
    $scope.violationDestinations = [];

    $scope.updateData = function(chart, index) {
      $meteor.call(
        'loadData',
        'pre11exactly1000000',
        Math.max(0, index - $scope.range + 1),
        Math.min(index + $scope.range, $scope.eventsCount),
        $scope.range * 2
      ).then(
        function(data) {
          var x;
          var indices = _.map(chart.dataProvider, function(e) {
            return e.index;
          })
          var firstIndex = data[0]['_source'].index;
          if(chart.dataProvider.length > 0) {
            var previousIndex = chart.dataProvider[chart.dataProvider.length-1].index;
            if(firstIndex > previousIndex + 1) {
              var guide = new AmCharts.Guide();
              guide.label = "hidden part";
              guide.category = firstIndex.toString();
              guide.toCategory = previousIndex.toString();
              guide.labelRotation = 90;
              guide.lineColor = "#E6E600";
              guide.lineAlpha = 1;
              guide.fillColor = "#E6E600";
              guide.fillAlpha = 0.4;
              guide.inside = true;
              chart.categoryAxis.addGuide(guide);
            }
          }
          _.each(data, function(o) {
            x = o['_source'];
            if(_.contains(indices, x.index))
              return;
            if (_.contains($scope.violationSources, x.index)) {
              x.color = "#CC3300";
            }
            else
            if (_.contains($scope.violationDestinations, x.index))
              x.color = "#666633";
            else
              x.color = "#FFFFFF";
            x.constant = 10;
            chart.dataProvider.push(x);
          });
          chart.validateData();
        },
        function(err) {
          console.log('[elasticsearch] loading data failed', err);
        }
      );
    }

    $scope.chart = AmCharts.makeChart("plot", {
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
        "gridAlpha": 0.07,
        "labelRotation": 45,
        "labelOffset": 10
      },
      "graphs": [{
        "balloonText": "<b><span style='font-size:14px;'>index: [[index]]</span></b><br/><b><span style='font-size:14px;'>event: [[event]]</span></b><br/><b><span style='font-size:14px;'>timestamp: [[timestamp]]</span></b>",
        "bullet": "round",
        "bulletBorderAlpha": 0.4,
        "bulletSize": 10,
        "colorField": "color",
        "hideBulletsCount": 50,
        "title": "violations",
        "lineThickness": 2,
        "valueField": "constant",
        "useLineColorForBulletBorder": true
      }],
      "chartScrollbar": {
      },
      "creditsPosition": "bottom-right"
    });

    $scope.plotViolation = function(violation) {
      $scope.chart.dataProvider = [];

      // switch (violation.pattern) {
      //   case "precedence":
          switch (violation.type) {
            case "NSOR":
              $scope.violationSources = violation.effects;
              $scope.violationDestinations = [];
              break;
            default:
              $scope.violationSources = violation.effects;
              $scope.violationDestinations = violation.causes;
          }
      //     break;
      //   default:
      //     $scope.violationSources = [];
      //     $scope.violationDestinations = [];
      // }

      if($scope.pattern.type === "precedence") {
        var indices = _.union($scope.violationDestinations, $scope.violationSources);
        $scope.chart.categoryAxis.guides = [];

        _.each($scope.violationSources, function(source) {
          $meteor.call(
            'locateDistance',
            'pre11exactly1000000',
            source,
            $scope.pattern.distance,
            false,//TODO
            true//TODO turn expand on/off
          ).then(
            function(data) {
              var insertTo = _.sortedIndex(indices, data);
              indices.splice(insertTo, 0, data);
              //http://jsfiddle.net/api/post/library/pure/
              //http://www.amcharts.com/tips/add-and-remove-guides-dynamically/
              var guide = new AmCharts.Guide();
              guide.label = "expected temporal distance";
              guide.category = data.toString();
              guide.toCategory = source.toString();
              guide.labelRotation = 0;
              guide.position = "top";
              guide.lineColor = "#3399FF";
              guide.lineAlpha = 1;
              guide.fillColor = "#3399FF";
              guide.fillAlpha = 0.4;
              // guide.expand = true;
              guide.inside = true;
              $scope.chart.categoryAxis.addGuide(guide);
              if(source === _.last($scope.violationSources)) {
                _.each(indices, function(index) {
                  $scope.updateData($scope.chart, index);
                });
              }
            },
            function(err) {
              console.log('[elasticsearch] getting event failed', err);
            }
          );
        });

      }

    };

  }
]);
