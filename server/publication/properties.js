Meteor.publish("properties", function (fields) {
  return Properties.find(fields);
});
