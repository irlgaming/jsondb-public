var global = {};

Ti.App.addEventListener("JSONDBDataTampered", function(event) { Ti.API.info(event); });

var jsondb = require('com.irlgaming.jsondb');

/**
 * sets query debugging to true - provides console output
 */
jsondb.debug(false);

/**
 * creates a new global.collection, or opens an existing one
 */
global.collection = jsondb.factory('test', 'mysecretkey');

/**
 * clears the global.collection (resets it to an empty state)
 */
global.collection.clear();

/**
 * this code adds a bunch of new objects to the global.collection
 */
var names = ['Tom', 'Dick', 'Harry', 'John'];
for(var i=0; i < 500; i++) {
	var a = [];
	var n = jsondb.JSONDB.functions.randomFromTo(3, 12);
	for(var j=0; j < n; j++) {
		a.push(jsondb.JSONDB.functions.randomFromTo(0, 100));
	}
	global.collection.save({
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
	});
}

/**
 * commits the global.collection to disk
 */
global.collection.commit();

/**
 * count all objects where i is less than or equal to 20
 */
Ti.API.info("{i:{$lte:20}, n:{$gte:6}}: " + global.collection.count({i:{$lte:20}, n:{$gte:6}}));

/**
 * find all objects where the field i has a value in the provided array
 */
Ti.API.info("{i:{$in:[1, 2, 3, 4, 5]}}: " + global.collection.count({i:{$in:[1, 2, 3, 4, 5]}}));

/**
 * reaches into a nested object to query for a loc.lat value of less than or equal to 5
 */
Ti.API.info("{'loc.lat':{$lte:5}}: " + global.collection.count({'loc.lat':{$lte:5}}));

/**
 * find all objects where the length of field 's' is 8
 */
Ti.API.info("{s:{$size:8}}: " + global.collection.count({s:{$size:8}}));

/**
 * find all objects where the length of field 'o' is 5
 */
Ti.API.info("{o:{$size:5}}: " + global.collection.count({o:{$size:5}}));

/**
 * find all objects where the field 'n' doesn't exist
 */
Ti.API.info("{n:{$exists:false}}: " + global.collection.count({n:{$exists:false}}));

/**
 * all objects where i is greater than or equal to 70
 */
Ti.API.info("{i:{$gte:70}}: " + global.collection.count({i:{$gte:70}}));

/**
 * all objects where i is greater than 50 or n is less than 40
 */
Ti.API.info("{i:{$gt:50}, $or:{n:{$lt:40}}}: " + global.collection.count({i:{$gt:50}, $or:{n:{$lt:40}}}));

/**
 * all objects where i is greater than 50 or n is less than 40, sorted by i descending limiting results to 30
 */
Ti.API.info("{i:{$gt:50}, $or:{n:{$lt:40}}}, {$sort:{i:-1}, $limit:30}: " + global.collection.count({i:{$gt:50}, $or:{n:{$lt:40}}}, {$sort:{i:-1}, $limit:30}));

/**
 * all objects where field 'loc' lies within the geo-spatial area defined by the center point 5, 5 and the radius 0.9
 * limiting results to 10
 */
Ti.API.info("{loc:{$within:[[5, 5], 0.9]}}: " + global.collection.count({loc:{$within:[[5, 5], 0.9]}}));

/**
 * update all objects where i is less than or equal to 90 and set n to 10 and name to "Steve"
 */
global.collection.update({i:{$lte:90}}, {$set:{n:10, s:'Steve'}});

Ti.API.info("{name:'Steve', n:10}: " + global.collection.count({s:'Steve', n:10}));
Ti.API.info("{n:10}: " + global.collection.count({n:10}));
Ti.API.info("{a:5}: " + global.collection.count({a:5}));
Ti.API.info("{a:{$ne:5}}: " + global.collection.count({a:{$ne:5}}));
Ti.API.info("{as:5}: " + global.collection.count({as:5}));

/**
 * update all objects where i is greater than or equal to 90 and increment n by 1
 */
global.collection.update({i:{$gte:90}}, {$inc:{n:1}});

/**
 * update all objects where i is greater than or equal to 90 and increment n by 1, limiting the updates to the first 10 objects sorted by id randomly
 */
global.collection.update({i:{$gte:90}}, {$inc:{n:1}}, {$limit:10, $sort:{$id:0}});

/**
 * update all objects where i is greater than or equal to 90 and un-set n
 */
global.collection.update({i:{$gte:90}}, {$unset:{n:true}});

/**
 * find all objects where the field 'n' exists
 */
Ti.API.info("{n:{$exists:true}}: " + global.collection.count({n:{$exists:true}}));

Ti.API.info("distinct s: " + JSON.stringify(global.collection.distinct("as")));
Ti.API.info("distinct s: " + JSON.stringify(global.collection.distinct("as", {s:'Harry'})));