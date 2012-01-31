Ti.App.addEventListener("JSONDBDataTampered", function(event) { Ti.API.info(event); });

var jsondb = require('com.irlgaming.jsondb');

jsondb.debug(true);

Ti.Utils.sha1("testing");
Ti.Filesystem.applicationDataDirectory;

/**
 * creates a new collection, or opens an existing one
 */
var collection = jsondb.factory('large', 'thisisasharedsecret');
collection.clear();

var d = "A typical sample programming application that once written, demonstrates complete mastery of choice language, particularly in subclassing and, of course, database API's.";

for(var i=0; i < 20000; i++) {
	collection.save({
		loc: {
			lat: jsondb.JSONDB.functions.randomFromTo(-130, 130),
			lng: jsondb.JSONDB.functions.randomFromTo(-130, 130)
		},
		term: Math.random().toString(36).substring(7),
		i: jsondb.JSONDB.functions.randomFromTo(1, 30),
		definition:d
	});
}

collection.commit();

for(var i=0; i < 300; i++) {
	var s = new RegExp("^[" + Math.random().toString(36).substring(5, 7) + "]", "gi");
	collection.count({i:jsondb.JSONDB.functions.randomFromTo(1, 30)});
	collection.count({term:s});
	Ti.API.info(Titanium.Platform.availableMemory);
}