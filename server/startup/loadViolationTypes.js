Meteor.startup(function () {
  if (ViolationTypes.find().count() === 0) {
    console.log("Start loading violation types");
    var violationTypes = [
      {
        "name": "NSOC",
        "bulletColor": "#DB4C3C",
        "description": "No-Show Occurrence"
      },
      {
        "name": "UNOC",
        "bulletColor": "#660066",
        "description": "Unexpected Occurrence"
      },
      {
        "name": "NSOR",
        "bulletColor": "#CC0000",
        "description": "No-Show Order"
      },
      {
        "name": "WTC",
        "bulletColor": "#1919FF",
        "description": "Wrong Temporal Chain"
      },
      {
        "name": "WTO",
        "bulletColor": "#FF33CC",
        "description": "Wrong Temporal Order"
      },
      {
        "name": "WTOC",
        "bulletColor": "#3333CC",
        "description": "Wrong Temporal Order and Wrong Temporal Chain"
      },
      {
        "name": "LVRI",
        "bulletColor": "#000099",
        "description": "Left Valid Chain and Right Invalid Chain"
      },
      {
        "name": "LIRV",
        "bulletColor": "#006699",
        "description": "Left Invalid Chain and Right Valid Chain"
      },
      {
        "name": "LIRI",
        "bulletColor": "#0099FF",
        "description": "Left Invalid Chain and Right Invalid Chain"
      }
    ];
    for (var i = 0; i < violationTypes.length; i++) {
      ViolationTypes.insert(violationTypes[i]);
    }
  }
});
