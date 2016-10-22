Meteor.publish("violationtypes", function () {
  return ViolationTypes.find({});
});
