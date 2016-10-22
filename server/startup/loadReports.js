Meteor.startup(function () {

  if (Reports.find().count() === 0) {
    console.log("Start loading reports");
    var reports = [
      {
        'property': 'pre11exactly',
        'trace': 'pre11exactly1000000',
        'violations': [
          {
            'index': 1,
            'type': 'NSOR',
            'effects': [259]
          },
          {
            'index': 2,
            'type': 'WTO',
            'causes': [261],
            'effects': [406]
          },
          {
            'index': 3,
            'type': 'WTO',
            'causes': [854, 856],
            'effects': [1204]
          },
          {
            'index': 4,
            'type': 'WTO',
            'causes': [1289],
            'effects': [1407]
          },
          {
            'index': 5,
            'type': 'WTO',
            'causes': [524510, 525242],
            'effects': [525546]
          },
          {
            'index': 6,
            'type': 'WTO',
            'causes': [526084],
            'effects': [526148]
          },
          {
            'index': 7,
            'type': 'WTO',
            'causes': [527206, 527208],
            'effects': [527296]
          },
          {
            'index': 8,
            'type': 'WTO',
            'causes': [999576],
            'effects': [999651]
          }
        ]
      }
    ];
    for (var i = 0; i < reports.length; i++) {
      Reports.insert(reports[i]);
    }
  }
});
