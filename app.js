var window = Ti.UI.createWindow({
	backgroundColor:'white'
});
var label = Ti.UI.createLabel();
window.add(label);
window.open();

Ti.App.addEventListener("dataTampered", function(event) { Ti.API.info(event); });

var jsondb = require('com.irlgaming.jsondb');

/**
 * sets query debugging to true - provides console output
 */
jsondb.debug(true);

/**
 * creates a new collection, or opens an existing one
 */
var collection = jsondb.factory('test', 'YOURSECRETHERE');
var collection2 = jsondb.factory('test2', 'YOURSECRETHERE');

/**
 * clears the collection (resets it to an empty state)
 */
collection.clear();
collection2.clear();

/**
 * this code adds a bunch of new objects to the collection
 */
for(var i=0; i < 100; i++) {
	collection.save({
		i:i,
		n:i*2,
		s:'string ' + i,
		a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f', 'g'],
		ts:(new Date()).getTime(),
		o: {
			a: 1,
			b: 2,
			c: 3,
			d: 4,
			e: 5
		},
		loc: {
			lng: jsondb.functions.randomFromTo(0, 10),
			lat: jsondb.functions.randomFromTo(0, 10)
		}
	});
}

/**
 * commits the collection to disk
 */
collection.commit();

/**
 * create a series of DBRef objects referencing objects in the 'test' collection
 */
var o = collection.getAll();
for(var i=0; i < o.length; i++) {
	collection2.save({
		i:i,
		n:i*2,
		ref:jsondb.factoryDBRef('test', o[i].$id)
	});
}
collection2.commit();

/**
 * resolve dbref linkages
 */
var o = collection2.find({i:{$lte:20}});
for(var i=0; i < o.length; i++) {
	var obj = o[i].ref.resolve();
	Ti.API.info(obj);
}

/**
 * count all objects where i is less than or equal to 20
 */
var c = collection.find({i:{$lte:20}});

/**
 * find all objects where the field i has a value in the provided array
 */
var o = collection.find({i:{$in:[1, 2, 3, 4, 5]}});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{i:{$in:[1, 2, 3, 4, 5]}}: " + collection.count({i:{$in:[1, 2, 3, 4, 5]}}));

/**
 * reaches into a nested object to query for a loc.lat value of less than or equal to 5
 */
var o = collection.find({'loc.lat':{$lte:5}});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{'loc.lat':{$lte:5}}: " + collection.count({'loc.lat':{$lte:5}}));

/**
 * find all objects where the length of field 's' is 8
 */
var o = collection.find({s:{$size:8}});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{s:{$size:8}}: " + collection.count({s:{$size:8}}));

/**
 * find all objects where the length of field 'o' is 5
 */
var o = collection.find({o:{$size:5}});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{o:{$size:5}}: " + collection.count({o:{$size:5}}));

/**
 * find all objects where the field 'n' doesn't exist
 */
var o = collection.find({$exists:{n:false}});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{$exists:{n:false}}: " + collection.count({$exists:{n:false}}));

/**
 * all objects where i is greater than or equal to 70
 */
var o = collection.find({i:{$gte:70}});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{i:{$gte:70}}: " + collection.count({i:{$gte:70}}));

/**
 * all objects where i is greater than 50 or n is less than 40
 */
var o = collection.find({i:{$gt:50}, $or:{n:{$lt:40}}});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{i:{$gt:50}, $or:{n:{$lt:40}}}: " + collection.count({i:{$gt:50}, $or:{n:{$lt:40}}}));

/**
 * all objects where i is greater than 50 or n is less than 40, sorted by i descending limiting results to 30
 */
var o = collection.find({i:{$gt:50}, $or:{n:{$lt:40}}}, {$sort:{i:-1}, $limit:30});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{i:{$gt:50}, $or:{n:{$lt:40}}}, {$sort:{i:-1}, $limit:30}: " + collection.count({i:{$gt:50}, $or:{n:{$lt:40}}}, {$sort:{i:-1}, $limit:30}));

/**
 * all objects where field 'loc' lies within the geo-spatial area defined by the center point 5, 5 and the radius 0.9
 * limiting results to 10
 */
var o = collection.find({loc:{$within:[[5, 5], 0.9]}}, {$limit:10});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{loc:{$within:[[5, 5], 0.9]}}: " + collection.count({loc:{$within:[[5, 5], 0.9]}}));

/**
 * update all objects where i is greater than or equal to 90 and set n to 10
 */
collection.update({i:{$gte:90}}, {$set:{n:10}});

/**
 * update all objects where i is greater than or equal to 90 and increment n by 1
 */
collection.update({i:{$gte:90}}, {$inc:{n:1}});

/**
 * update all objects where i is greater than or equal to 90 and increment n by 1, limiting the updates to the first 10 objects sorted by id randomly
 */
collection.update({i:{$gte:90}}, {$inc:{n:1}}, {$limit:10, $sort:{$id:0}});

/**
 * update all objects where i is greater than or equal to 90 and un-set n
 */
collection.update({i:{$gte:90}}, {$unset:{n:true}});

/**
 * find all objects where the field 'n' exists
 */
var o = collection.find({n:{$exists:true}});
for(var i=0; i < o.length; i++) {
	//Ti.API.info(o[i]);
}

Ti.API.info("{n:{$exists:true}}: " + collection.count({n:{$exists:true}}));
