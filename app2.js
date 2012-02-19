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