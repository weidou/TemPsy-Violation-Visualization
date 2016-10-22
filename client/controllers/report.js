angular.module("violationreporting").controller("ReportCtrl", ['$scope', '$stateParams', '$meteor', '$scope', '$timeout',
  function($scope, $stateParams, $meteor, $scope, $timeout) {

    $scope.allViolations = [];
    $scope.violationSources = [];
    $scope.violationDestinations = [];
    $scope.violationLocations = [];
    $scope.page = 1;
    $scope.perPage = 3;
    $scope.constant = 0;
    $scope.timeUnit = 'tu';
    $scope.defaultBulletsCount = 60;
    $scope.isGreenGuideVisible = false;
    $scope.isRedGuideVisible = false;
    $scope.toggleSegmentsLabel = 'segment';

    $meteor.autorun($scope, function() {
      $scope.segments = $scope.getCollectionReactively('allViolations')[$scope.getReactively('page') - 1];
    });

    $scope.$meteorSubscribe('reports').then(function(subscriptionHandle) {
      // promise - need more exploration
      // http://angular-meteor.com/api/subscribe
      $scope.report = $meteor.object(Reports, new Mongo.ObjectID($stateParams.reportID),false);

      if(!_.isEmpty($scope.report)) {
        $scope.elasticIndexName = $scope.report.trace;

        if($scope.report.violationsList.length > 1) {
          $scope.toggleSegmentsLabel = 'segments';
        }

        var allViolations = [];
        var tempList = [];
        var remainder = $scope.perPage;
        var violationsCount = 0;
        var segmentIndex = 0;
        _.each($scope.report.violationsList, function(segment){
          var len = segment.violations.length;
          if(len === 0) len = 1;
          violationsCount += len;

          var begin = 0;
          while(begin + remainder <= len) {
            tempList.push(_.extend(
              {},
              segment,
              {
                'len': len,
                'globalStartIndex': violationsCount - len + begin,
                'segmentIndex': segmentIndex,
                'segmentStartIndex': begin,
                'violations': segment.violations.slice(begin, begin + remainder)
              }
            ));
            allViolations.push(tempList);
            tempList = [];
            begin += remainder;
            remainder = $scope.perPage;
          }
          if(begin !== len){
            tempList.push(_.extend(
              {},
              segment,
              {
                'len': len,
                'globalStartIndex': violationsCount - len + begin,
                'segmentIndex': segmentIndex,
                'segmentStartIndex': begin,
                'violations': segment.violations.slice(begin, begin + remainder)
              }
            ));
            remainder = begin + remainder - len;
          }
          segmentIndex++;
        });
        if(!_.isEmpty(tempList)){
          allViolations.push(tempList);
        }
        $scope.allViolations = allViolations;
        $scope.violationsCount = violationsCount;

        $timeout(function() {
          $scope.plotLinks = $('a.plot-link');
        }, 50);

        $scope.$meteorSubscribe('properties', {'name': $scope.report.property}).then(function(subscriptionHandle) {
          $scope.property = $meteor.object(Properties, {}, false);
          if(!_.isEmpty($scope.property)) {
            $scope.scope = $scope.property.scope;
            $scope.scopeType = $scope.scope.type;

            $scope.pattern = $scope.property.pattern;
            $scope.patternType = $scope.pattern.type;

            switch ($scope.patternType) {
              case 'universality':
                $scope.pagedViolations = _.reduce(allViolations, function(result, violations) {
                  result.push(_.chain(violations).pluck('violations').map(function(violationsItem) {
                    return _.pluck(violationsItem, 'index');
                  }).value());
                  return result;
                }, []);
                break;
              case 'absence':
              case 'existence':
                $scope.pagedViolations = _.reduce(allViolations, function(result, violations) {
                  result.push(_.pluck(violations, 'violations'));
                  return result;
                }, []);
                break;
              case 'precedence':
              case 'response':
                $scope.pagedViolations = _.reduce(allViolations, function(result, violations) {
                  result.push(_.map(_.pluck(violations, 'violations'), function(violationsItem) {
                    return _.chain(violationsItem).map(function(violationItem) {
                      return _.chain(violationItem).pick('cause', 'effect').values().flatten().value();
                    }).value();
                  }));
                  return result;
                }, []);
                break;
            }

            $scope.setSidePanel();
            $scope.setPatternPhrases();
            // get all violation indices
            $scope.union();
            $scope.createSegmentsGuides();
            $meteor.call('loadTraceSize', $scope.elasticIndexName)
            .then(
              function(data) {
                $scope.maxLength = data;
                $scope.locations = _.union(_.flatten($scope.scopeBoundaries), $scope.violationLocations, [1, $scope.maxLength]).sort(function(a, b) {return a-b;});
                if(_.has($scope.pattern, 'distance')) {
                  var sourceBounds, forward, include;
                  if($scope.patternType === 'precedence') {
                    forward = false;
                  } else {// response
                    forward = true;
                  }
                  $scope.plotOrderPattern($scope.locations, $scope.defaultBulletsCount, forward);
                } else {
                  var sampledIndices = $scope.sample($scope.locations, $scope.defaultBulletsCount);
                  $scope.plotByIDs(sampledIndices, $scope.defaultBulletsCount);
                }
              },
              function(err) {
                console.log('[elasticsearch] retrieving trace size failed', err);
              }
            );
          }
        });
      }
    });
    // have not been used yet
    $scope.violationTypes = $meteor.collection(ViolationTypes).subscribe('violationtypes');

    $scope.createSegmentsGuides = function() {
      var yellow = '#FFD480';
      $scope.segmentsGuides = _.reduce($scope.scopeBoundaries, function(segmentsGuides, boundaries) {
        var guide = new AmCharts.Guide();
        guide.category = boundaries[0];
        guide.toCategory = boundaries[1];
        guide.position = "top";
        guide.lineColor = yellow;
        guide.lineAlpha = 0.7;
        guide.fillColor = yellow;
        guide.fillAlpha = 0.5;
        segmentsGuides.push(guide);
        return segmentsGuides;
      }, []);
    };

    $scope.initializePlot = function(data) {
      if(typeof data === 'undefined' || data === null) {
        data = [];
      }
      if(_.isUndefined($scope.chart)) {
        $scope.defaultDataProvider = data;
        $scope.chart = AmCharts.makeChart("plot", {
          "type": "serial",
          "theme": "light",
          "pathToImages": "http://www.amcharts.com/lib/3/images/",
          "legend": {
            "equalWidths": false,
            "useGraphSettings": true,
            "valueAlign": "left",
            "valueWidth": 100,
            "clickMarker": $scope.legendClicked,
            "clickLabel": $scope.legendClicked
          },
          "valueAxes": [{
            "stackType": "regular",
            "axisAlpha": 0,
            "gridAlpha": 0,
            "dashLength": 1,
            "labelsEnabled": false
          }],
          "chartCursor": {
            "categoryBalloonEnabled": false
          },
          "startDuration": .6,
          "export": {
            "enabled": false
          },
          "dataProvider": data,
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
          "balloon": {
            "textAlign": "left"
          },
          "graphs": [{
            "id": "distance",
            "alphaField": "alpha",
            "balloonText": "<b>distance: [[distance]] tu</b>",
            "fillAlphas": 0.8,
            // "legendPeriodValueText": "[[distance.open]] - [[distance.close]]",
            "legendValueText": "[[distance]]",
            "title": "distance",
            "type": "column",
            "valueField": "distance",
            "hidden": true
          },{
            "id": "gap",
            "alphaField": "alpha",
            "balloonText": "<b>gap: [[gap]]</b>",
            "fillAlphas": 0.8,
            "legendValueText": "[[gap]]",
            "title": "index gap",
            "type": "column",
            "valueField": "gap",
            "hidden": true
          },{
            "id": "irrelevantEvent",
            "balloonText": "<b><span style='font-size:14px;'>index: [[index]]</span></b><br/><b><span style='font-size:14px;'>event: [[event]]</span></b><br/><b><span style='font-size:14px;'>timestamp: [[timestamp]]</span></b>",
            "bullet": "round",
            "bulletBorderAlpha": 0.4,
            "bulletSize": 10,
            "lineColor": "#A3A375",
            "hideBulletsCount": $scope.defaultBulletsCount,
            // "legendPeriodValueText": "[[index.low]] - [[index.high]]",
            "legendValueText": "[[irrelevantEvent]]@[[irrelevantTimestamp]]",
            "title": "irrelevant event",
            "lineThickness": 0,
            "valueField": "constant"
          },{
            "id": "relevantEvent",
            "balloonText": "<b><span style='font-size:14px;'>index: [[index]]</span></b><br/><b><span style='font-size:14px;'>event: [[event]]</span></b><br/><b><span style='font-size:14px;'>timestamp: [[timestamp]]</span></b>",
            "bullet": "round",
            "bulletBorderAlpha": 0.4,
            "bulletSize": 10,
            "colorField": "color",
            "hideBulletsCount": $scope.defaultBulletsCount,
            // "legendPeriodValueText": "[[index.low]] - [[index.high]]",
            "legendValueText": "[[relevantEvent]]@[[relevantTimestamp]]",
            "title": "relevant event",
            "lineThickness": 0,
            "valueField": "relevantValue"
          }],
          "chartScrollbar": {
            "updateOnReleaseOnly": true
          }
        });
        _.each($scope.segmentsGuides, function(guide) {
          $scope.chart.categoryAxis.addGuide(guide);
        });
        $scope.checkLegendVisibility();
        $scope.chart.validateNow(true, true);
        $scope.chart.addListener('zoomed', $scope.chartZoomed);
        $scope.chart.addListener("clickGraphItem", $scope.graphItemClicked);
      } else {
        $scope.chart.dataProvider = $scope.defaultDataProvider;
        var i = 0;
        var item;
        var start=data[0].index, end=data[data.length-1].index;
        var startIndex, endIndex, flag=true;
        while(i < $scope.defaultDataProvider.length) {
          item = $scope.defaultDataProvider[i];
          if(item.index >= start && flag) {
            startIndex = i;
            flag = false;
          } else if(item.index <= end) {
            endIndex = i;
          }
          i = i + 1;
        }
        Array.prototype.splice.apply($scope.chart.dataProvider, [startIndex, endIndex + 1 - startIndex].concat(data));
        // disable zoomed event when updating data
        $scope.chart.removeListener($scope.chart, 'zoomed', $scope.chartZoomed);
        $scope.checkLegendVisibility();
        $scope.chart.validateNow(true, true);
        $scope.chart.zoomToIndexes(startIndex, startIndex + data.length - 1);
        $scope.chart.addListener('zoomed', $scope.chartZoomed);
      }
    };

    $scope.plotOrderPattern = function(indices, size, forward) {
      $scope.greenGuides = [];
      $scope.redGuides = [];
      var distanceComparison = $scope.pattern.distance.comparison;
      var distanceValue = $scope.pattern.distance.value;
      $meteor.call(
        'loadDistances',
        $scope.elasticIndexName,
        $scope.sourceBounds,
        distanceValue,
        forward,
        distanceComparison
      ).then(
        function(data) {
          var green = '#99FF99';
          var red = '#993399';
          var color;
          $scope.guidelines = _.pluck(data, 'temporalBound');
          $scope.locations = _.union(indices, $scope.guidelines).sort(function(a, b) {return a-b;});
          for(var i = 0; i < data.length; i++) {
            var bound = data[i];
            var sourceBound = bound.index;
            var violationType = bound.violationType;
            var temporalBound = bound.temporalBound;
            if(violationType === 'WTC') {
              color = green;
            } else {
              color = red;
            }
            //http://jsfiddle.net/api/post/library/pure/
            //http://www.amcharts.com/tips/add-and-remove-guides-dynamically/
            var guide = new AmCharts.Guide();
            guide.position = "top";
            guide.lineColor = color;
            guide.lineAlpha = 0.7;
            if(distanceComparison === 'at most') {
              if(forward) {
                guide.category = sourceBound.toString();
                guide.toCategory = temporalBound.toString();
              } else {
                guide.category = temporalBound.toString();
                guide.toCategory = sourceBound.toString();
              }
              guide.fillColor = color;
              guide.fillAlpha = 0.5;
            } else {
              guide.dashLength = 0;
              guide.lineThickness = 3;
              guide.category = temporalBound.toString();
            }
            // guide.expand = true;
            if(color === green) {
              $scope.greenGuides.push(guide);
            } else {
              $scope.redGuides.push(guide);
            }
          }
          if(!_.isEmpty($scope.greenGuides)) {
            $scope.isGreenGuideVisible = true;
          }
          if(!_.isEmpty($scope.redGuides)) {
            $scope.isRedGuideVisible = true;
          }
          var ids = $scope.sample($scope.locations, $scope.defaultBulletsCount);
          $scope.plotByIDs(ids, $scope.defaultBulletsCount);
        },
        function(err) {
          console.log('[elasticsearch] retrieving event failed', err);
        }
      );
    };

    $scope.graphItemClicked = function(event) {
      var index = parseInt(event.item.category);
      var i, j, k;
      if(_.contains($scope.violationLocations, index)) {
        k = -1;
        switch ($scope.patternType) {
          case 'universality':
          case 'absence':
          case 'existence':
            search_occurrence:
            for (i = 0; i < $scope.pagedViolations.length; i++) {
              var subViolations = $scope.pagedViolations[i];
              for (j = 0; j < subViolations.length; j++) {
                k = _.indexOf(subViolations[j], index);
                if(k >= 0) break search_occurrence;
              }
            }
            break;
          case 'precedence':
          case 'response':
            search_order:
            for (i = 0; i < $scope.pagedViolations.length; i++) {
              var segmentViolations = $scope.pagedViolations[i];
              for (j = 0; j < segmentViolations.length; j++) {
                var violationsItem = segmentViolations[j];
                for (var k = 0; k < violationsItem.length; k++) {
                  if(_.contains(violationsItem[k], index)) {
                    break search_order;
                  }
                }
              }
            }
          break;
        }
        $scope.pageChanged(i+1);
        $timeout(function() {
          $scope.plotViolation($scope.allViolations[i][j], k);
        }, 100);
      }
    };

    $scope.legendClicked = function(graph) {
      var chart = graph.chart;
      if(graph.hidden) {
        chart.showGraph(graph);
      } else {
        chart.hideGraph(graph);
        _.defer(function() {
          var theOther = _.difference(["relevantEvent", "irrelevantEvent"], graph.id);
          if(theOther.length === 1 && !theOther[0].hidden) {
            var toHideGraphs = ["distance", "gap"];
            for( var i = 0; i < chart.graphs.length; i++ ) {
              if (_.contains(toHideGraphs, chart.graphs[i].id))
                chart.hideGraph(chart.graphs[i]);
            }
          }
        });
      }
      // return false so that default action is canceled
      return false;
    };

    $scope.checkLegendVisibility = function() {
      if($scope.hideIrrelevantLegend) {
        $scope.chart.graphs[2].visibleInLegend = false
      } else {
        $scope.chart.graphs[2].visibleInLegend = true
      }
      if($scope.hiderelevantLegend) {
        $scope.chart.graphs[3].visibleInLegend = false
      } else {
        $scope.chart.graphs[3].visibleInLegend = true
      }
    };

    $scope.chartZoomed = function(event) {
      // var selectedPeriod = $scope.chart.dataProvider.slice(event.startIndex, event.endIndex+1);
      var start = Number(event.startValue);
      var end = Number(event.endValue);
      var extent = Math.round((end - start) / 3);

      if(_.first($scope.locations) !== start && _.contains($scope.locations, start)) {
        var startIndex = _.sortedIndex($scope.locations, start);
        var i = startIndex - 1;
        if($scope.patternType === 'precedence') {
          while(i < $scope.locations.length && _.contains($scope.guidelines, $scope.locations[i])) {
            i--;
          }
        }
        if(extent === 0 || end === _.last($scope.locations)) {
          start = Math.round((start + $scope.locations[i]) / 2);
        } else {
          start -= Math.min(Math.round((start - $scope.locations[i]) / 2), extent);
        }
      }
      if(_.last($scope.locations) !== end && _.contains($scope.locations, end)) {
        var endIndex = _.sortedIndex($scope.locations, end);
        var i = endIndex + 1;
        if($scope.patternType === 'response') {
          while(i < $scope.locations.length && _.contains($scope.guidelines, $scope.locations[i])) {
            i++;
          }
        }
        if(extent === 0 || start === 1) {
          end = Math.floor(($scope.locations[i] + end) / 2);
        } else {
          end += Math.min(Math.floor(($scope.locations[i] - end) / 2), extent);
        }
      }
      var newLocations = _.union($scope.locations, [start, end]).sort(function(a, b) {return a-b;});
      var startIndex = _.sortedIndex(newLocations, start);
      var endIndex = _.sortedIndex(newLocations, end);
      var indices = $scope.sample(newLocations.slice(startIndex, endIndex + 1), $scope.defaultBulletsCount);
      $scope.plotByIDs(indices, $scope.defaultBulletsCount);
    };

    // generate n numbers by given a sorted numbers array
    $scope.sample = function(sortedNumbersArray, n) {
      if(_.isArray(sortedNumbersArray) && sortedNumbersArray.length < n) {
        var min = _.first(sortedNumbersArray);
        var max = _.last(sortedNumbersArray);
        var m = n+1-sortedNumbersArray.length;
        var step = Math.round((max - min)/(m));
        var ans = _.range(min, max, step).slice(0,m);
        ans = _.union(ans, sortedNumbersArray).sort(function(a, b) {return a-b;});
        return ans;
      } else {
        return sortedNumbersArray;
      }
    };

    $scope.plotByIDs = function(ids, size) {
      $meteor.call('loadEventsByIDs', $scope.elasticIndexName, ids, size)
      .then(
        function(data) {
          var previousTimestamp = data[0]['_source'].timestamp;
          var previousIndex = data[0]['_source'].index;
          var tempData = [];
          $scope.hiderelevantLegend = true;
          $scope.hideIrrelevantLegend = true;
          _.each(data, function(o) {
            x = o['_source'];
            switch ($scope.patternType) {
              case "universality":
              case "absence":
              case "existence":
                if (_.contains($scope.violationLocations, x.index)) {
                  x.color = "#CC3300";
                  x.relevantValue = $scope.constant;
                  $scope.hiderelevantLegend = false;
                  x.relevantEvent = x.event;
                  x.relevantTimestamp = x.timestamp;
                  x.irrelevantEvent = '-';
                  x.irrelevantTimestamp = '-';
                } else {
                  x.constant = $scope.constant;
                  $scope.hideIrrelevantLegend = false;
                  x.relevantEvent = '-';
                  x.relevantTimestamp = '-';
                  x.irrelevantEvent = x.event;
                  x.irrelevantTimestamp = x.timestamp;
                }
                break;
              case "precedence":
              case "response":
                if (_.contains($scope.violationSources, x.index)) {
                  x.color = "#CC3300";
                  x.relevantValue = $scope.constant;
                  $scope.hiderelevantLegend = false;
                  x.relevantEvent = x.event;
                  x.relevantTimestamp = x.timestamp;
                  x.irrelevantEvent = '-';
                  x.irrelevantTimestamp = '-';
                } else if (_.contains($scope.violationDestinations, x.index)) {
                  x.color = "#002E8A";
                  x.relevantValue = $scope.constant;
                  $scope.hiderelevantLegend = false;
                  x.relevantEvent = x.event;
                  x.relevantTimestamp = x.timestamp;
                  x.irrelevantEvent = '-';
                  x.irrelevantTimestamp = '-';
                } else {
                  x.constant = $scope.constant;
                  $scope.hideIrrelevantLegend = false;
                  x.relevantEvent = '-';
                  x.relevantTimestamp = '-';
                  x.irrelevantEvent = x.event;
                  x.irrelevantTimestamp = x.timestamp;
                }
                break;
            }
            x.distance = x.timestamp - previousTimestamp;
            x.gap = x.index - previousIndex;
            previousTimestamp = x.timestamp;
            previousIndex = x.index;
            tempData.push(x);
          });
          $scope.initializePlot(tempData);
        },
        function(err) {
          console.log('[elasticsearch] retrieving events failed', err);
        }
      );
    };

    $scope.unionUniversality = function() {
      $scope.violationLocations = _.pluck(_.flatten(_.pluck($scope.report.violationsList, 'violations')), 'index');
    }

    $scope.unionOccurrences = function() {
      $scope.violationLocations = _.flatten(_.pluck($scope.report.violationsList, 'violations'));
    };

    $scope.unionPrecedence = function() {
      var violationSources = [];
      var violationDestinations = [];
      var sourceBounds = [];
      _.each(_.flatten(_.pluck($scope.report.violationsList, 'violations')), function(violation) {
        switch (violation.type) {
          case "NSOR":
            violationSources = violationSources.concat(violation.effect);
            break;
          default:
            violationSources = violationSources.concat(violation.effect);
            violationDestinations = violationDestinations.concat(violation.cause);
        }
        sourceBounds.push({
          'index': violation.effect[0],
          'violationType': violation.type
        });
      });
      $scope.sourceBounds = sourceBounds;
      $scope.violationSources = violationSources;
      $scope.violationDestinations = violationDestinations;
      $scope.violationLocations = violationDestinations.concat(violationSources).sort(function(a, b) {return a-b;});
    };

    $scope.unionResponse = function() {
      var violationSources = [];
      var violationDestinations = [];
      var sourceBounds = [];
      _.each(_.flatten(_.pluck($scope.report.violationsList, 'violations')), function(violation) {
        switch (violation.type) {
          case "NSOR":
            violationSources = violationSources.concat(violation.cause);
            break;
          default:
            violationSources = violationSources.concat(violation.cause);
            violationDestinations = violationDestinations.concat(violation.effect);
        }
        sourceBounds.push({
          'index': _.last(violation.cause),
          'violationType': violation.type
        });
      });
      $scope.sourceBounds = sourceBounds;
      $scope.violationSources = violationSources;
      $scope.violationDestinations = violationDestinations;
      $scope.violationLocations = violationSources.concat(violationDestinations).sort(function(a, b) {return a-b;});
    };

    $scope.union = function() {
      $scope.scopeBoundaries = _.map($scope.report.violationsList, function(elem) {
        return _.chain(elem).pick('scopeBegin', 'scopeEnd').values().value();
      });
      switch ($scope.patternType) {
        case "universality":
          $scope.unionUniversality();
          break;
        case "absence":
        case "existence":
          $scope.unionOccurrences();
          break;
        case "precedence":
          $scope.unionPrecedence();
          break;
        case "response":
          $scope.unionResponse();
          break;
      }
    }

    $scope.setSidePanel = function() {
      switch ($scope.patternType) {
        case "universality":
          $scope.universalityPattern = true;
          $scope.occurrencePattern = false;
          $scope.orderPattern = false;
          break;
        case "absence":
        case "existence":
          $scope.universalityPattern = false;
          $scope.occurrencePattern = true;
          $scope.orderPattern = false;
          break;
        case "precedence":
        case "response":
          $scope.universalityPattern = false;
          $scope.occurrencePattern = false;
          $scope.orderPattern = true;
          break;
      }
    }

    $scope.setPatternPhrases = function() {
      var pattern = $scope.pattern;
      switch ($scope.patternType) {
        case "universality":
          $scope.highlightedEvents = pattern.event;
          break;
        case "absence":
        case "existence":
          if(_.has(pattern, 'comparison')) {
            $scope.highlightedEvents = pattern.comparison + ' ' + pattern.times + ' ' + pattern.event;
          } else {
            $scope.highlightedEvents = pattern.event;
          }
          break;
        case "precedence":
          $scope.highlightedEvents = _.pluck(pattern.cause, 'event');
          if(pattern.hasOwnProperty('distance')) {
            $scope.distancePhrase = 'preceding ' + pattern.distance.comparison + ' ' + pattern.distance.value + ' ' + $scope.timeUnit;
          }
          break;
        case "response":
          $scope.highlightedEvents = _.pluck(pattern.effect, 'event');
          // $scope.patternEvents = _.unique(_.pluck(pattern.cause.concat(pattern.effect), 'event'));
          if(pattern.hasOwnProperty('distance')) {
            $scope.distancePhrase = 'responding ' + pattern.distance.comparison + ' ' + pattern.distance.value + ' ' + $scope.timeUnit;
          }
          break;
        //TODO
      }
    }

    $scope.getHighlightedPhrases = function(violationType) {
      var phrases = [];
      switch (violationType) {
        case "NSOC":
        case "UNOC":
          return $scope.highlightedEvents;
        case "NSOR":
          return $scope.highlightedEvents;
        case "WTO":
          return $scope.distancePhrase;
        case "WTOC":
        case "LIRV":
        case "LVRI":
        case "LIRI":
          phrases = phrases.concat($scope.distancePhrase);
          // no break
        case "WTC":
          var distance;
          if($scope.patternType === 'precedence') {
            distance = $scope.pattern.cause[1].distance;
          } else {
            distance = $scope.pattern.effect[1].distance;
          }
          if($scope.highlightedEvents.length === 2) {
            return phrases.concat(phrases.concat(distance.comparison + ' ' + distance.value + ' ' + $scope.timeUnit));
          } else {
            //TODO when length > 2
            // _.each(violation.effect, function(index) {
            //     return timestamps.push(_.findWhere($scope.chart.dataProvider, {'index': index}).timestamp);
            //   });
          }
          break;
        default:
          return $scope.highlightedEvents;
      }
    }

    // move .active to current violation link
    $scope.switchActiveLink = function($index) {
      $timeout(function() {
        var plotLinks = $scope.plotLinks;
        plotLinks.each(function() {
          $(this).removeClass('active');
        });
        $(plotLinks[$index]).addClass('active');
      }, 100);
    };

    $scope.plotViolation = function(segment, $index) {
      $scope.switchActiveLink(segment.globalStartIndex + $index - ($scope.page - 1) * $scope.perPage);
      // get highlighted events
      var violationType;
      if(_.hasOwnProperty(segment, 'violationType')) {
        violationType = segment.violationType;
      } else {
        violationType = segment.violations[$index].type;
      }
      $scope.highlightedPhrases =
      $scope.getHighlightedPhrases(violationType);
      var startIndex, endIndex;
      if(segment.len === 1) {
        startIndex = segment.scopeBegin;
        endIndex = segment.scopeEnd;
      } else {
        switch ($scope.patternType) {
          case 'universality':
            startIndex = endIndex = segment.violations[$index].index;
            break;
          case 'absence':
          case 'existence':
            startIndex = endIndex = segment.violations[$index];
            break;
          case 'precedence':
          case 'response':
            var violationIndices = _.chain(segment.violations[$index]).pick('cause', 'effect').values().flatten().value();
            startIndex = violationIndices[0];
            endIndex = _.last(violationIndices);
            break;
        }
      }
      if(segment.segmentStartIndex + $index === 0) {
        startIndex = segment.scopeBegin;
      } else if(segment.segmentStartIndex + $index === segment.len - 1) {
        endIndex = segment.scopeEnd;
      }

      if(startIndex === $scope.scopeBoundaries[0][0]) {
        startIndex = 1;
      }
      if(endIndex === _.last($scope.scopeBoundaries)[1]) {
        endIndex = $scope.maxLength;
      }
      startIndex = _.sortedIndex($scope.chart.dataProvider, {'index': startIndex}, 'index');
      endIndex = _.sortedIndex($scope.chart.dataProvider, {'index': endIndex}, 'index');
      $scope.chart.zoomToIndexes(startIndex, endIndex);
    };

    $scope.pageChanged = function(newPageNumber) {
      $scope.page = parseInt(newPageNumber);
      $timeout(function() {
        $scope.plotLinks = $('a.plot-link');
      }, 50);
    };

    $scope.toggleGreenGuide = function(e) {
      $target = $(e.currentTarget);
      if($target.hasClass('btn-green')) {
        _.each($scope.greenGuides, function(guide) {
          $scope.chart.categoryAxis.removeGuide(guide);
        });
        $target.removeClass('btn-green');
      } else {
        _.each($scope.greenGuides, function(guide) {
          $scope.chart.categoryAxis.addGuide(guide);
        });
        $target.addClass('btn-green');
      }
      $scope.chart.validateNow(false, true);
    };
    $scope.toggleRedGuide = function(e) {
      $target = $(e.currentTarget);
      if($target.hasClass('btn-red')) {
        _.each($scope.redGuides, function(guide) {
          $scope.chart.categoryAxis.removeGuide(guide);
        });
        $target.removeClass('btn-red');
      } else {
        _.each($scope.redGuides, function(guide) {
          $scope.chart.categoryAxis.addGuide(guide);
        });
        $target.addClass('btn-red');
      }
      $scope.chart.validateNow(false, true);
    };
    $scope.toggleSegmentsGuide = function(e) {
      $target = $(e.currentTarget);
      if($target.hasClass('btn-yellow')) {
        _.each($scope.segmentsGuides, function(guide) {
          $scope.chart.categoryAxis.removeGuide(guide);
        });
        $target.removeClass('btn-yellow');
      } else {
        _.each($scope.segmentsGuides, function(guide) {
          $scope.chart.categoryAxis.addGuide(guide);
        });
        $target.addClass('btn-yellow');
      }
      $scope.chart.validateNow(false, true);
    };
    $scope.toggleSegmentGuide = function(e, $index) {
      $target = $(e.currentTarget);
      if($target.hasClass('btn-yellow')) {
        $scope.chart.categoryAxis.removeGuide($scope.segmentsGuides[$index]);
        $target.removeClass('btn-yellow');
      } else {
        $scope.chart.categoryAxis.addGuide($scope.segmentsGuides[$index]);
        $target.addClass('btn-yellow');
      }
      $scope.chart.validateNow(false, true);
    }
  }
]);
