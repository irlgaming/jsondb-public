var jsondb = require('com.irlgaming.jsondb');

var global = {};

/**
 * Trap exceptions where users attempt to tamper with collection data
 */
Ti.App.addEventListener("JSONDBDataTampered", function(event) { Ti.API.info(event); });

/**
 * Trap download success and add documents to the local collection
 */
Ti.App.addEventListener("JSONDBDownloadSuccess", function(event) {
	var names = ['Tom', 'Dick', 'Harry', 'John'];
	for(var i=0; i < 100; i++) {
		var a = [];
		var n = jsondb.JSONDB.functions.randomFromTo(3, 12);
		for(var j=0; j < n; j++) {
			a.push(jsondb.JSONDB.functions.randomFromTo(0, 100));
		}
		var o3 = {
			i:i,
			n:jsondb.JSONDB.functions.randomFromTo(10, 30),
			s:names[jsondb.JSONDB.functions.randomFromTo(0, 3)],
			a:a,
			as:a.length,
			term: Math.random().toString(36).substring(7),
			ts:(new Date()).getTime(),
			o: {
				a: jsondb.JSONDB.functions.randomFromTo(1, 30),
				b: jsondb.JSONDB.functions.randomFromTo(1, 30),
				c: jsondb.JSONDB.functions.randomFromTo(1, 30),
				d: jsondb.JSONDB.functions.randomFromTo(1, 30),
				e: jsondb.JSONDB.functions.randomFromTo(1, 30)
			},
			loc: {
				lng: jsondb.JSONDB.functions.randomFromTo(-130, 130),
				lat: jsondb.JSONDB.functions.randomFromTo(-130, 130)
			}
		};
		var o2 = global.collection.find({}, {$sort:{$id:0}, $limit:1});
		if(o2.length == 1) {
			o3.object = jsondb.factoryDBRef('test:documents', o2[0].$id);
		}
		global.collection.save(o3);
	}	
	var o = global.collection.find({}, {$limit:5});
	o.forEach(function(d){
		global.collection.remove({$id:d.$id});
	})
	global.collection.commit();
	global.collection.API.save();
});

/**
 * Trap upload errors
 */
Ti.App.addEventListener("JSONDBUploadError", function(event) {
	Ti.API.info(event);
});

/**
 * sets query debugging to true - provides console output
 */
jsondb.debug(true);

/**
 * creates a new global.collection, or opens an existing one
 */
global.collection = jsondb.factory('test:documents', 'mysecretkey');
global.collection.clear();

/**
 * set up MongoDB REST API and load documents from the remote collection
 */
global.collection.initializeAPI('api.mongolab.com', 'mymongolabapikey', {s:'Harry'});
global.collection.API.load();