Reports = new Mongo.Collection("reports");

Reports.allow({
  insert: function(userId, report) {
    return true;
  },
  update: function(userId, report, filds, modifier) {
    return true;
  },
  remove: function(userId, report) {
    return true;
  }
});

// deprecated since reports are now insertd by eclipse using MongoDB Java driver
Reports.after.insert(function (userId, doc) {
  if(Traces.find({'name': doc.trace}).count() === 0) {
    Traces.insert({
      'name': doc.trace,
      'violations': [{
        'property': doc.property,
        'count': doc.violations.length
      }]
    });
  } else {
    //http://docs.mongodb.org/manual/reference/operator/update/push/#append-a-value-to-an-array
    if(Traces.find({'violations.property': doc.property}).count === 0){
      Traces.update(
        {'name': doc.trace},
        {
          '$push': {
            'violations': {
              'property': doc.property,
              'count': doc.violations.length
            }
          }
        }
      );
    } else {
      Traces.update(
        {'violations.property': doc.property},
        {//http://mongoblog.tumblr.com/post/21792332279/updating-one-element-in-an-array
          '$set': {
            'violations.$.count': doc.violations.length
          }
        }
      );
    }
  }
});
