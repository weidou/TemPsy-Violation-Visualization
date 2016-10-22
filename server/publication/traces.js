Meteor.publish("traces", function () {
  return Traces.find({});
});
