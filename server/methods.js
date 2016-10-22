Meteor.methods({
  // elasticsearch
  loadOne: function(index, start, end, size) {
    var searchData = {
      "size": size,
      "sort": [{"index": {"order": "asc"}}],
      "query": {
        "range": {
          "index": {
            "gte": start,
            "lte": end
          }
        }
      }
    };
    var response = HTTP.post('http://127.0.0.1:9200/' + index + '/_search', {data: searchData}); //?search_type=count
    // console.log(start, end, response.content, response.data.hits.hits.length);
    return response.data.hits.hits;
  },

  loadAll: function(index, ranges, size) {
    var filters = [];
    _.each(ranges, function (range) {
      filters.push({
        "range": {
          "index": {
            "gte": range[0],
            "lte": range[1]
          }
        }
      });
    });

    var searchData = {
      "size": size,
      "sort": [{"index": {"order": "asc"}}],
      "query": {
        "filtered": {
          "filter": {
            "or": filters
          }
        }
      }
    };

    var response = HTTP.post('http://127.0.0.1:9200/' + index + '/_search', {data: searchData});
    return response.data.hits.hits;
  },

  loadTraceSize: function(index) {
    var searchData = {
      "query": {
        "match_all": {}
      }
    };
    var response = HTTP.post('http://127.0.0.1:9200/' + index + '/_count', {data: searchData});
    return response.data.count;
  },

  loadEventsByIDs: function(index, ids, size) {
    var searchData = {
      "size": size,
      "sort": [{"index": {"order": "asc"}}],
      "query": {
        "ids" : {
          "values" : ids
        }
      }
    };

    var response = HTTP.post('http://127.0.0.1:9200/' + index + '/_search', {data: searchData});
    return response.data.hits.hits;
  },

  loadDistances: function(index, sourceBounds, distanceValue, forward, comparisonStr) {
    var searchData, response, cutoff, operator, comparison, order;
    var header = 'http://127.0.0.1:9200/' + index + '/_search';

    searchData = {
      "size": sourceBounds.length,
      "sort": [{"index": {"order": "asc"}}],
      "query": {
        "ids" : {
          "values" : _.pluck(sourceBounds, 'index')
        }
      }
    };

    response = HTTP.post(header, {data: searchData});
    var sourceBoundsTimestamps = _.pluck(_.pluck(response.data.hits.hits, '_source'), 'timestamp');

    if(forward) {
      operator = "+";
      if(comparisonStr === "at most") {
        order = "desc";
        comparison = "<=";
      } else {
        order = "asc";
        comparison = ">=";
      }
    } else {
      operator = "-";
      if(comparisonStr === "at most") {
        order = "asc";
        comparison = ">=";
      } else {
        order = "desc";
        comparison = "<=";
      }
    }
    // // retrieve min(timestamp) and max(timestamp)
    // searchData = {
    //   "aggs": {
    //     "timestamp_stats": {
    //       "stats": {
    //         "field": "timestamp"
    //       }
    //     }
    //   }
    // };
    // response = HTTP.post(header + '?search_type=count', {data: searchData});
    // var minTimestamp = parseInt(response.data.aggregations.timestamp_stats.min);
    // var maxTimestamp = parseInt(response.data.aggregations.timestamp_stats.max);

    var temporalBounds = [];

    for (var i = 0; i < sourceBounds.length; i++) {
      var cutoff = eval(sourceBoundsTimestamps[i] + operator + distanceValue);
      searchData = {
        "size": 1,
        "sort": [{"index": {"order": order}}],
        "query": {
          "filtered": {
            "filter": {
              "script": {
                "script": "doc[\"timestamp\"].value " + comparison + " cutoff",
                "params" : {"cutoff" : cutoff},
                "_cache": true
              }
            }
          }
        }
      };
      response = HTTP.post(header, {data: searchData});
      if(!_.isEmpty(response.data.hits.hits)) {
        temporalBounds.push(
          _.extend(
            sourceBounds[i],
            {"temporalBound": response.data.hits.hits[0]._source.index}
          )
        );
      }
    }
    return temporalBounds;
  },

  // grouby trace using MongoDB Aggregation
  // not used and need aggregate package
  aggregateReports: function() {
    return Reports.aggregate([{'$group': {'_id': '$trace', 'reports':{'$push': '$$ROOT'}}}]);
  }
});
