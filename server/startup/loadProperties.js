Meteor.startup(function () {
  if (Properties.find().count() === 0) {
    console.log("Start loading properties");
    var properties = [
      {
        'name': 'pre11exactly',
        'scope':{
          'type': 'globally'
        },
        'pattern': {
          'type': 'precedence',
          'causes': ['a'],
          'effects': ['b'],
          'distance': '600',
          'comparison': 'exactly'
        }
      },
      {
        'name': 'pre1mexactly',
        'scope':{
          'type': 'globally'
        },
        'pattern': {
          'type': 'precedence',
          'causes': ['a'],
          'effects': ['b', 'c', 'd'],
          'distance': '600',
          'comparison': 'exactly'
        }
      }
    ];
    for (var i = 0; i < properties.length; i++) {
      Properties.insert(properties[i]);
    }
  }
});
