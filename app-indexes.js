/**
 *   JSONDB is a module for Titanium that allows you to create, query and store collections of JavaScript objects in your iOS applications. 
 *   All data managed by JSONDB is secured from tampering once committed to storage. JSONDB provides an advanced NoSQL query interface allowing 
 *   traversal, retrieval, mutation and sorting of objects within collections.
 *   
 *   Copyright (C) 2012 IRL Gaming Pty Ltd (ohlo@irlgaming.com)
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var global = {};

Ti.App.addEventListener("JSONDBDataTampered", function(event) { Ti.API.info(event); });

var jsondb = require('com.irlgaming.jsondb');
jsondb.debug(true);

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
for(var i=0; i < 10000; i++) {
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
 * Perform un-indexes queries
 */
Ti.API.info("{n:20, as:5}: " + global.collection.count({n:20, as:5}));
Ti.API.info("{n:{$ne:24}}: " + global.collection.count({n:{$ne:24}}));
Ti.API.info("{n:{$lte:20, $gte:15}}: " + global.collection.count({n:{$lte:20, $gte:15}}));
Ti.API.info("{n:20, as:5, 'loc.lng':{$gt:90}}: " + global.collection.count({n:20, as:5, 'loc.lng':{$gt:90}}));
Ti.API.info("{n:20, as:5, $or:{s:'Dick'}}: " + global.collection.count({n:20, as:5, $or:{s:'Dick'}}));
Ti.API.info("{term:/^[abc]/i}: " + global.collection.count({term:/^[abc]/i}));
Ti.API.info("{i:3000}: " + global.collection.count({i:3000}));

/**
 * Create indexes
 */
global.collection.ensureIndex({i:-1});
global.collection.ensureIndex({n:1});
global.collection.ensureIndex({s:1});
global.collection.ensureIndex({n:1, as:-1});
global.collection.ensureIndex({n:1, as:-1, 'loc.lng':-1});
global.collection.ensureIndex({term:-1});

/**
 * Perform the same queries again with indexes in place
 */
Ti.API.info("{n:20, as:5}: " + global.collection.count({n:20, as:5}));
Ti.API.info("{n:{$ne:24}}: " + global.collection.count({n:{$ne:24}}));
Ti.API.info("{n:{$lte:20, $gte:15}}: " + global.collection.count({n:{$lte:20, $gte:15}}));
Ti.API.info("{n:20, as:5, 'loc.lng':{$gt:90}}: " + global.collection.count({n:20, as:5, 'loc.lng':{$gt:90}}));
Ti.API.info("{n:20, as:5, $or:{s:'Dick'}}: " + global.collection.count({n:20, as:5, $or:{s:'Dick'}}));
Ti.API.info("{term:/^[abc]/i}: " + global.collection.count({term:/^[abc]/i}));
Ti.API.info("{i:3000}: " + global.collection.count({i:3000}));