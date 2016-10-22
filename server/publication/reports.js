Meteor.publish('reports', function (options, searchString) {
  if (searchString == null)
    searchString = '';

  Counts.publish(this, 'numberOfReports', Reports.find({
    $or:[
      {'trace' : { '$regex' : '.*' + searchString || '' + '.*', '$options' : 'i' }},
      {'property' : { '$regex' : '.*' + searchString || '' + '.*', '$options' : 'i' }}
    ]
  }), { noReady: true });
  return Reports.find({
    $or:[
      {'trace' : { '$regex' : '.*' + searchString || '' + '.*', '$options' : 'i' }},
      {'property' : { '$regex' : '.*' + searchString || '' + '.*', '$options' : 'i' }}
    ]
  }, options);
});
