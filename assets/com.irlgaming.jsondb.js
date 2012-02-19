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

/**
 * Global module name space
 */
var exports = {
	JSONDB: {
		classes: {},
		objects: {},
		functions: {},
		variables: {},
		constants: {}
	}
};

/**
 * Global variables
 */
// flag specifying whether or not to log debug output to the console
exports.JSONDB.variables.debug = false;

// the variables below are used for string comparison operations
exports.JSONDB.variables.$eq = "$eq";
exports.JSONDB.variables.$ne = "$ne";
exports.JSONDB.variables.$exists = "$exists";
exports.JSONDB.variables.$size = "$size";
exports.JSONDB.variables.$within = "$within";
exports.JSONDB.variables.$gt = "$gt";
exports.JSONDB.variables.$gte = "$gte";
exports.JSONDB.variables.$lt = "$lt";
exports.JSONDB.variables.$lte = "$lte";
exports.JSONDB.variables.$in = "$in";
exports.JSONDB.variables.$in = "$nin";
exports.JSONDB.variables.$or = "$or";
exports.JSONDB.variables.$sort = "$sort";
exports.JSONDB.variables.$unset = "$unset";
exports.JSONDB.variables.$inc = "$inc";
exports.JSONDB.variables.$set = "$set";

// a cache used to store traversal information for objects between inner loop iterations
exports.JSONDB.variables.tcache = {};

/**
 * Global constants
 */
exports.JSONDB.constants.INDEX_TYPE_B_TREE = 0;
exports.JSONDB.constants.INDEX_TYPE_UNIQUE = 1;
exports.JSONDB.constants.DEFAULT_API_HOST = 'api.mongolab.com';
exports.JSONDB.constants.DEFAULT_FS_DIR = Titanium.Filesystem.applicationDataDirectory;
exports.JSONDB.constants.ID_FIELD = '$id';
exports.JSONDB.constants.REF_FIELD = '$ref';

/**
 * the JSONDB database interface class
 * @constructor
 */
exports.JSONDB.classes.Database = function() {

	this._collections = {};	
	
	/**
	 * Factories are new JSONDB Collection instance. Collection objects are singleton instances - the pattern is implemented in this factory function.
	 * @param name the name of the collection to factory
	 * @param secret the shared secret to use when signing data for the collection
	 * @param path the file system location store collection data to
	 * @param override whether or not to override collection name restrictions
	 * @return JSONDB Collection instance
	 */
	this.getCollection = function(name, secret, path, override) {
		if(name in this._collections) {
			return this._collections[name].c;
		}
		var collection = new exports.JSONDB.classes.Collection(name, secret, path, override);
		collection.open();
		this._collections[name] = {
			c:collection,
			t:(new Date()).getTime()
		}
		return this._collections[name].c;
	};	
	
};

/**
 * The JSONDB MongoLab REST API connector
 * @constructor
 * @param name the name of the collection to connect to
 * @param host the API host name to connect to
 * @param key the API access key to use when performing HTTP requests
 * @param query the query object to use when loading objects from the MongoDB collection
 */
exports.JSONDB.classes.MongoRESTManager = function(name, host, key, query) {

	if(host == undefined) {
		host = exports.JSONDB.constants.DEFAULT_API_HOST;
	}
	
	this._name = name;
	this._db = null;
	this._cn = null;
	this._host = host;
	this._key  = key;
	this._query = query;
	this._base = 'https://' + this._host + '/api/1';

	if(this._name.match(/\:/) == null) {
		throw 'badly formed collection identified, please use the format database:collection';
	}
	var c = this._name.split(':', 2);
	this._db = c[0];
	this._cn = c[1];
	
	/**
	 * Loads objects from the MongoDB collection
	 * @param collection the JSONDB collection struct to load objects into
	 * @return void
	 */
	this.load = function(collection) {
		
		var u = this._base + '/databases/' + this._db + '/collections/' + this._cn + '?apiKey=' + this._key;
		if(this._query != undefined) {
			u += '&q=' + JSON.stringify(this._query);
		}

		var _t = this;

		var xhr = Titanium.Network.createHTTPClient();
		xhr.onerror = function(e) {
			Ti.App.fireEvent('JSONDBDownloadError', {error: e.error});
		};

		xhr.onload = function(e) {
			var t = this;
			if(this.status != 200) {
				Ti.App.fireEvent('JSONDBDownloadError', {error: e.error, response: t.responseText});
				return;
			}
			var o = JSON.parse(this.responseData);
			o.forEach(function(object) {
				object.$id = object._id.$oid;
				delete object._id;
				collection._objects[object.$id] = object; 
			});
			Ti.App.fireEvent('JSONDBDownloadSuccess', {collection_name: _t._cn});
		};
		
		xhr.open('GET', u);
		xhr.send()

	};
	
	/**
	 * Saves JSONDB collection data to the MongoLab REST API
	 * @param collection the collection of objects to send
	 * @return void
	 */
	this.save = function(collection) {

		var u = this._base + '/databases/' + this._db + '/collections/' + this._cn + '?apiKey=' + this._key;
		var _t = this;
		
		var xhr = Titanium.Network.createHTTPClient();
		xhr.validatesSecureCertificate = false;
		xhr.onreadystatechange = function() {};
		xhr.timeout = 30000;

		xhr.onerror = function(e) {
			Ti.App.fireEvent('JSONDBUploadError', {error: e.error});
		};

		xhr.onload = function(e) {
			var t = this;
			if(this.status != 200) {
				Ti.App.fireEvent('JSONDBUploadError', {response: t.responseText, status: t.status});
				return;
			}
			Ti.App.fireEvent('JSONDBUploadSuccess', {response: t.responseText, status: t.status});
			_t._deleteDocuments();
		};

		var o = [];
		var obj = null;
		for(var k in collection._objects) {
			obj = exports.JSONDB.functions.cloneObject(collection._objects[k]);
			this._normalizeObjectIds(obj);
			o.push(obj);
		}

		xhr.open('PUT', u);
		xhr.setRequestHeader("Content-Type", "application/json");		
		xhr.send(JSON.stringify(o));

	};

	this._normalizeObjectIds = function(o) {
		for(var k in o) {
			if(k == exports.JSONDB.constants.ID_FIELD) {
				if(exports.JSONDB.constants.REF_FIELD in o) {
					o.$id = {$oid: o.$id};
					o.$ref = this._cn;
				} else {
					o._id = {$oid: o.$id};
					delete o.$id;
				}
			} else {
				if(typeof(o[k]) == 'object') {
					this._normalizeObjectIds(o[k]);
				}
			}
		}
	};
	
	this._deleteDocuments = function() {
		
		if(this._name.match(/\:/) == null) {
			throw 'badly formed collection identified, please use the format database:collection';
		}
		
		var c = this._name.split(':', 2);
		var u = this._base + '/databases/' + c[0] + '/collections/' + c[1];				
		var k = this._key;
		var o = exports.JSONDB.objects.Log.find({cl:this._name, cm:'delete'});
		
		o.forEach(function(d) {
			
			var url = u + '/' + d.$id + '?apiKey=' + k;
			
			var xhr = Titanium.Network.createHTTPClient();
			xhr.validatesSecureCertificate = false;
			xhr.timeout = 30000;

			xhr.onerror = function(e) {
				Ti.App.fireEvent('JSONDBDeleteError', {error: e.error});
			};

			xhr.onload = function(e) {
				var t = this;
				if(this.status != 200) {
					Ti.App.fireEvent('JSONDBDeleteError', {error: e.error, response: t.responseText, status: t.status});
					return;
				}
				exports.JSONDB.objects.Log.remove({$id:d.$id});
				exports.JSONDB.objects.Log.commit();
				Ti.App.fireEvent('JSONDBDeleteSuccess', {o: o, response: t.responseText, status: t.status});
			};

			xhr.open('DELETE', url);
			xhr.send();
			
		});
		
	};
	
}

/**
 * The file system I/O manager for JSONDB collections
 * @constructor
 */
exports.JSONDB.classes.FilesystemManager = function() {
	
	/**
	 * Loads a JSONDB collection from disk
	 * @param filename the name of the collection file to load
	 * @param secret the secret to use when signing collection data
	 * @param path the file system path to save to
	 * @return object/boolean
	 */
	this.load = function(filename, secret, path) {
		if(path == undefined) {
			path = exports.JSONDB.constants.DEFAULT_FS_DIR;
		}
		filename += '.json';
		var file = Titanium.Filesystem.getFile(path, filename);
		if (file.exists()) {
			var data = JSON.parse(file.read());
			if(exports.JSONDB.objects.CryptoProvider.verifySignature(data, secret, data._salt) == false) {
				Ti.App.fireEvent("JSONDBDataTampered", {filename:filename});
				return false;
			}
			delete data.sig;
			return data;
		}			
		return false;
	};
	
	/**
	 * Saves a JSONDB collection to disk
	 * @param filename the name of the collection file to save to
	 * @param data the data to save to disk
	 * @param secret the secret to use when signing collection data
	 * @param path the file system path to save to
	 * @return boolean
	 */
	this.save = function(filename, data, secret, path) {
		filename += '.json';
		if(path == undefined) {
			path = exports.JSONDB.constants.DEFAULT_FS_DIR;
		}		
		if(data._salt == null) {
			data._salt = Ti.Utils.sha1((new Date()).getTime() + "");
		}
		data._sig = exports.JSONDB.objects.CryptoProvider.signData(data, secret, data._salt);
		var file = Titanium.Filesystem.getFile(path, filename);
		file.write(JSON.stringify(data));
		return true;
	};		
	
};

/**
 * Provides cryptography utility functions for JSONDB collections
 * @constructor
 */
exports.JSONDB.classes.CryptoProvider = function() {
	
	/**
	 * Generates a signature given a string
	 * @param string the string to sign
	 * @param secret the secret to use when calculating a signature
	 * @param salt the secret to use when calculating a signature
	 * @return string
	 */
	this.generateSignature = function(string, secret, salt) {
		return Ti.Utils.sha1(Ti.Utils.sha1(string + secret) + salt);
	};	
	
	/**
	 * Signs a JavaScript object
	 * @param data the data to sign
	 * @param secret the secret to use when calculating a signature
	 * @param salt the secret to use when calculating a signature
	 * @return string
	 */
	this.signData = function(data, secret, salt) {
		data._sig = salt;
		return this.generateSignature(JSON.stringify(data), secret, salt);
	};
	
	/**
	 * Verifies the signature provided as part of a JavaScript object against a calculated signature
	 * @param data the data to verify
	 * @param secret the secret to use when calculating a signature
	 * @param salt the secret to use when calculating a signature
	 * @return boolean
	 */
	this.verifySignature = function(data, secret, salt) {
		oldSig = data._sig;
		newSig = this.signData(data, secret, salt);
		return  newSig == oldSig;
	};
	
	/**
	 * Generates a signature for a JSON encoded string
	 * @param data the data to sign
	 * @param secret the secret to use when calculating a signature
	 * @param salt the secret to use when calculating a signature
	 * @return string
	 */
	this.signJson = function(data, secret, salt) {
		return this.generateSignature(JSON.stringify(data), secret, salt);
	};
	
};

/**
 * A B-tree style index for JSONDB collections
 * @constructor
 * @param name the name of the index
 * @param definition an object defining the attributes to index and their individual sort orders
 * @param collection the JSONDB collection to index
 */
exports.JSONDB.classes.BTreeIndex = function(name, definition, collection) {
	
	this._count = 0;
	this._name = name;
	this._definition = definition;
	this._collection = collection;
	this._k = [];
	this._o = [];
	this._btree = {};
	this._rleaves = {};
	
	/**
	 * Returns the index type for the given index
	 * @return integer
	 */
	this.getType = function() {
		return exports.JSONDB.constants.INDEX_TYPE_B_TREE;
	}

	/**
	 * Clears the index
	 * @return void
	 */
	this.clear = function() {
		this._btree = {};
		this._rleaves = {};
	};
	
	/**
	 * Checks whether a given property is included in the index
	 * @param property the property to check
	 * @return boolean
	 */
	this.includesProperty = function(property) {
		for(var i=0; i < this._k.length; i++) {
			if(this._k[i] == property) {
				return true;
			}
		}
		return false;
	};	
	
	for(var __k in this._definition) {
		this._k.push(__k);
		this._o.push(parseInt(this._definition[__k]));
	}
	
	/**
	 * Builds the index using the provided collection
	 * @return void
	 */
	this.index = function() {
		this.clear();
		var ts = (new Date()).getTime();
		this._recursivelyBuildIndex(this._btree, this._k.slice(), this._o.slice(), this._collection.getAll());
		exports.JSONDB.functions.debug('building index ' + this._name + ' with ' + this._count + ' nodes took ' + ((new Date()).getTime() - ts) + ' ms');
	};

	this._recursivelyBuildIndex = function(btree, keys, order, objects) {
		// set up variables
		var k = keys.shift();
		var k2 = [];
		var v = order.shift();
		var o = {};
		var c = 0;
		var r = this._rleaves;
		// iterate objects
		var k3 = null;
		objects.forEach(function(object) {
			exports.JSONDB.variables.tcache = {};
			k3 = exports.JSONDB.functions.traverse(k, object);
			if(k3 !== undefined) {
				if(o[k3] == undefined) {
					o[k3] = [];
					k2.push(k3);
				}
				o[k3].push(object);
			}
		});
		if(v < 0) {
			k2.sort(function(v1, v2){return v2 - v1;});
		} else {
			k2.sort(function(v1, v2){return v1 - v2;});			
		}
		// set up b-tree index
		var l = k2.length;
		for(var i=0; i < l; i++) {
			k3 = k2[i];
			if(typeof(k3) == 'object') {
				continue;
			}
			btree[k3] = {};
			if(keys.length == 0) {
				o[k3].forEach(function(object) {
					btree[k3][object.$id] = object; // forward look-up (i.e. root to leaf)
					r[object.$id] = btree[k3]; // reverse look-up (i.e. leaf to root)
					c++;
				});
			} else {
				this._recursivelyBuildIndex(btree[k3], keys.slice(), order.slice(), o[k3]);
			}
		}		
		this._count += c;
	};

	/**
	 * Traverses the index using the provided query expression object and returns a list of matching objects
	 * @param query the query expression object
	 * @return array
	 */
	this.find = function(query) {
		var ts = (new Date()).getTime();
		var o = {};
		var a = {scanned:0}; // analytics
		var or = null;
		if(exports.JSONDB.variables.$or in query) {
			or = query.$or;
			delete query[exports.JSONDB.variables.$or];
		}
		this._recursiveFind(query, this._btree, 0, o, a);
		if(or !== null) {
			var o3 = this._collection.find(or);
			o3.forEach(function(object) {
				o[object.$id] = object;
			});
		}
		var o2 = [];
		for(var i in o) {
			o2.push(o[i]);
		}
		return o2;
	};
	
	this._recursiveFind = function(query, leaf, i, o, a) {
		var v = null;
		var l = this._k.length;
		if(i >= l) {
			return;
		}
			
		v = query[this._k[i]];
		if(v instanceof RegExp) {
			for(var k in leaf) {
				a.scanned++;
				if(typeof(k) !== 'string') {
					k = new String(k);
				}
				if(k.match(v) !== null) {
					if(i < (this._k.length - 1)) {
						this._recursiveFind(query, leaf[k], i+1, o, a);
					} else {
						for(var k1 in leaf[k]) {
							o[k1] = leaf[k][k1];
						}
					}						
				}
			}
		} if(typeof(v) == 'object') {
			for(var k in leaf) {
				a.scanned++;
				include = true;
				for(var f in v) {
					switch(f) {
						case exports.JSONDB.variables.$eq:
							if(k != v[f]) {
								include = false;
							}
							break;
								
						case exports.JSONDB.variables.$ne:
							if(k == v[f]) {
								include = false;
							}
							break;
							
						case exports.JSONDB.variables.$gt:
							if(k <= v[f]) {
								include = false;
							}
							break;
								
						case exports.JSONDB.variables.$gte:
							if(k < v[f]) {
								include = false;
							}
							break;
								
						case exports.JSONDB.variables.$lt:
							if(k >= v[f]) {
								include = false;
							}
							break;
								
						case exports.JSONDB.variables.$lte:
							if(k > v[f]) {
								include = false;
							}
							break;
					}
				}
				if(include == true) {
					if(i < (this._k.length - 1)) {
						this._recursiveFind(query, leaf[k], i+1, o, a);
					} else {
						for(var k1 in leaf[k]) {
							o[k1] = leaf[k][k1];
						}
					}
				}
			}
		} else {
			if(!(v in leaf)) {
				return [];
			}
			if(i == (this._k.length - 1)) {
				for(var k in leaf[v]) {
					o[k] = leaf[v][k];
				}					
			} else {
				a.scanned++;
				this._recursiveFind(query, leaf[v], i+1, o, a);
			}
		}
	};
	
	/**
	 * Removes an object from the index
	 * @param o the object to remove
	 * @return void
	 */
	this.remove = function(o) {
		if(o.$id in this._rleaves) {
			delete this._rleaves[o.$id][o.$id];
			delete this._rleaves[o.$id];
		}
	};
	
	/**
	 * Inserts an object into the index
	 * @param o the object to add to the index
	 * @return boolean
	 */
	this.insert = function(o) {
		for(var k in this._definition) {
			if(exports.JSONDB.functions.traverse(k, o) == undefined) {
				return false;
			}
		}
		this.remove(o);
		var v    = null;
		var leaf = this._btree;
		for(var k in this._definition) {
			v = o[k];
			if(!(v in leaf)) {
				leaf[v] = {};
			}
			leaf = leaf[v]
		}
		leaf[o.$id] = o;
		this._rleaves[o.$id] = leaf;
	};
	
};

/**
 * Represents a collection JavaScript objects
 * @constructor
 * @param name the name of the collection
 * @param secret the secret to use in cryptographic operations
 * @param the storage path for the collection
 * @param override whether or not to override internal constraints on collection names
 */
exports.JSONDB.classes.Collection = function(name, secret, path, override) {

	if(name == '__log' && override !== true) {
		throw 'The collection name __log is reserved for internal use by the JSONDB module';
	}
	
	this._secret = secret;
	this._path = path;
	this._indexes = {};
	this._indexed = false;
	this._io = exports.JSONDB.objects.FilesystemManager;

	this._collection = {
		_sig: null,
		_salt: null,
		_name: name,
		_version: 0.2,
		_objects: {},
		_lastInsertId: false
	};

	this._auto_commit = false;

	var __t = this;
	this.API = {
		_api: null,
		load: function() {
			this._api.load(__t._collection);
		},
		save: function() {
			this._api.save(__t._collection);
		}
	};	

	/**
	 * Creates an index using the provided definition (if it doesn't already exist)
	 * @param definition the definition to use when creating the index. This object should be a table of key value pairs with the keys representing the object attributes to index and values representing the sort order for the index branch (-1 descending, 1 ascending)
	 * @return void
	 */
	this.ensureIndex = function(definition) {
		var d = exports.JSONDB.functions.sortObjectKeys(definition);
		var n = exports.JSONDB.functions.generateIndexName(d, false);
		if(n in this._indexes) {
			return;
		} else {
			this._indexes[n] = new exports.JSONDB.classes.BTreeIndex(n, d, this);
			this._indexes[n].index();				
		}
		this._indexed = true;
	};

	/**
	 * Selects and returns the most appropriate b-tree index for the provided query expression object. If no index can be found to service the query the boolean value FALSE is returned.
	 * @param query the query expression object
	 * @return BTreeIndex/boolean
	 */
	this.selectIndex = function(query) {
		var n = exports.JSONDB.functions.generateIndexName(exports.JSONDB.functions.sortObjectKeys(query), false);
		if(n in this._indexes) {
			exports.JSONDB.functions.debug('using index ' + n);
			return this._indexes[n];
		}
		if(exports.JSONDB.functions.sizeOf(this._indexes) == 0) {
			this._indexed = false;
		}
		return false;
	};
	
	/**
	 * Drops the index corresponding to the provided definition (if it exists)
	 * @param definition the definition to use when removing the index.
	 * @return boolean
	 */
	this.dropIndex = function(definition) {
		var d = exports.JSONDB.functions.sortObjectKeys(definition);
		var n = exports.JSONDB.functions.generateIndexName(d, false);
		if(n in this._indexes) {
			delete this._indexes[n];
			return true;
		} else {
			return false;
		}
	};
	
	/**
	 * Sets whether or not the collection automatically commits to disk (defaults to false)
	 * @param value the boolean value to set on the collection
	 * @return void
	 */
	this.setAutoCommit = function(value) {
		this._auto_commit = value;
	};

	/**
	 * Initializes the MongoLab REST API connector for the collection
	 * @param host the host name for the API
	 * @param key the API key to use in HTTP requests
	 * @param query an query expression object used to filter objects when retrieving collections from the MongoLab REST API
	 * @return void
	 */
	this.initializeAPI = function(host, key, query) {
		this.API._api = new exports.JSONDB.classes.MongoRESTManager(this._collection._name, host, key, query);
	};
	
	/**
	 * Returns the length of the collection (i.e. how many objects it contains)
	 * @return integer
	 */
	this.sizeOf = function() {
		return exports.JSONDB.functions.sizeOf(this._collection._objects);
	};

	/**
	 * Returns the ObjectId of the last object to be added to the collection
	 * @return string
	 */
	this.getLastInsertId = function() {
		return this._collection._lastInsertId;
	};
	
	/**
	 * Loads the collection data from disk
	 * @return void
	 */
	this.open = function() {
		var c = this._io.load(name, this._secret, this._path);
		if(c !== false) {
			this._collection = c;
			this._unflatten(this._collection._objects);
		}
	};
	
	this._unflatten = function(objects) {
		for(var key in objects) {
			if(typeof(objects[key]) === 'object' && objects[key] !== null) {
				if('$ref' in objects[key]) {
					objects[key] = new exports.JSONDB.classes.DBRef(objects[key]);
				} else {
					this._unflatten(objects[key]);
				}
			}
		}
	};

	/**
	 * Retrieves a list of objects from the collection
	 * @param query the query expression object to use when filtering the collection
	 * @param conditions the conditions to apply to the result set
	 * @return array
	 */
	this.find = function(query, conditions) {
		var ts = (new Date()).getTime();
		if(typeof(query) === 'undefined') {
			query = {};
		}
		if(exports.JSONDB.constants.ID_FIELD in query) {
			r = [];
			if(!(query.$id in this._collection._objects)) {
				return r;
			}
			r.push(this._collection._objects[query.$id]);
			return r;
		}
		var closure = exports.JSONDB.objects.QueryCompiler.compile(query);
		var tuples = closure.execute(this);
		if(typeof(conditions) !== 'undefined') {
			if('$sort' in conditions) {
				var key, order = 0;
				for(key in conditions.$sort) {
					order = conditions.$sort[key];
					break;
				}
				exports.JSONDB.functions.$sort(tuples, key, order);
			}
			if('$limit' in conditions) {
				if(conditions.$limit < tuples.length) {
					tuples = tuples.slice(0, conditions.$limit);
				}
			}
		}
		exports.JSONDB.functions.debug('exports.JSONDB.classes.Collection.find (' + this._collection._name + ':' + exports.JSONDB.functions.stringify(query) + ' , ' +  exports.JSONDB.functions.stringify(conditions) + ') took ' + ((new Date()).getTime() - ts) + ' ms');
		return tuples;
	};

	/**
	 * Clears the collection (i.e. removes all objects)
	 * @return void
	 */
	this.clear = function() {
		this._collection._objects = {};
		for(var n in this._indexes) {
			this._indexes[n].clear();
		}		
	};

	/**
	 * Returns an array containing references to all objects in the collection
	 * @return array
	 */
	this.getAll = function() {
		var ts = (new Date()).getTime();
		var objects = [];
		for(var key in this._collection._objects) {
			objects.push(this._collection._objects[key]);
		}
		exports.JSONDB.functions.debug('exports.JSONDB.classes.Collection.getAll (' + this._collection._name + ') took ' + ((new Date()).getTime() - ts) + ' ms');
		return objects;
	};

	/**
	 * Adds an object to the collection
	 * @param o the object to add to the collection
	 * @return void
	 */
	this.save = function(o) {
		var ts = (new Date()).getTime();
		if(!(exports.JSONDB.constants.ID_FIELD in o)) {
			o.$id = exports.JSONDB.functions.generateBSONIdentifier();
			this._collection._lastInsertId = o.$id;
		}
		this._collection._objects[o.$id] = o;
		for(var n in this._indexes) {
			this._indexes[n].insert(o);
		}
		if(this._auto_commit) {
			this.commit();
		}
	};

	/**
	 * Updates a series of objects in the collection
	 * @param query the query expression object to use when filtering the collection
	 * @param updates the updates to apply the matching objects
	 * @param conditions the conditions to apply to the result set
	 * @param upsert a boolean flag indicating whether or not to insert missing object attributes
	 * @return array
	 */
	this.update = function(query, updates, conditions, upsert) {
		var ts = (new Date()).getTime();
		if(typeof(upsert) == 'undefined') {
			upsert = false;
		}
		var closure = exports.JSONDB.objects.MutateCompiler.compile(updates);
		var objects = this.find(query, conditions);
		closure.executeUpdate(objects, upsert);
		var l = objects.length;
		for(var n in this._indexes) {
			for(var i=0; i < l; i++) {
				this._indexes[n].insert(objects[i]);
			}
		}
		exports.JSONDB.functions.debug('exports.JSONDB.classes.Collection.update (' + this._collection._name + ':' + exports.JSONDB.functions.stringify(updates) + ') took ' + ((new Date()).getTime() - ts) + ' ms');
		return objects.length;
	};
	
	/**
	 * Returns a count of the objects extracted by the provided query expression object
	 * @param query the query expression object to user
	 * @return integer
	 */
	this.count = function(query) {
		return this.find(query).length;
	}
	
	/**
	 * Returns an object containing key, value pairs representing the distinct values for the provided key (and query if provided)
	 * @param key the key to find distinct values for
	 * @param query the query to use when aggregating results
	 * @return object
	 */
	this.distinct = function(key, query) {
		var o = this.find(query);
		var t = {};
		o.forEach(function(d) {
			if(!(d[key] in t)) {
				t[d[key]] = 0;
			}
			t[d[key]]++;
		});
		return t;
	};
	
	/**
	 * Removes all objects from the collection that correspond to the provided query expression and conditions. Returns the number of objects removed from the collection.
	 * @path query the query expression object to user
	 * @path conditions the conditions for the query
	 * @return integer
	 */
	this.remove = function(query, conditions) {
		var ts = (new Date()).getTime();
		var objects = this.find(query, conditions);
		var l = objects.length;
		var r = (this.API._api !== null);
		
		var ts2 = (new Date()).getTime();
		for(var i=0; i < l; i++) {
			var o = objects[i];
			delete this._collection._objects[o.$id];
			for(var n in this._indexes) {
				this._indexes[n].remove(o);
			}
			if(r) {
				exports.JSONDB.objects.Log.save({
					$id: o.$id,
					cl: this._collection._name,
					ts: (new Date()).getTime(),
					cm: "delete",
					o: o
				});
			}
		}
		if(this._indexed == true) {
			exports.JSONDB.functions.debug('took ' + ((new Date()).getTime() - ts2) + ' ms to update all indexes for ' + objects.length + ' records');
		}
		if(r) {
			exports.JSONDB.objects.Log.commit();
		}
		if(this._auto_commit) {
			this.commit();
		}
		exports.JSONDB.functions.debug('exports.JSONDB.classes.Collection.remove (' + this._collection._name + ') took ' + ((new Date()).getTime() - ts) + ' ms');
		return objects.length;
	};

	/**
	 * Commits the collection data to disk
	 * @return void
	 */
	this.commit = function() {
		var ts = (new Date()).getTime();
		this._io.save(name, this._collection, this._secret, this._path);
	};

};

/**
 * Represents a DBRef objects
 * @param struct the JavaScript object to wrap
 * @return void
 * @throws Exception (illegal object reference)
 */
exports.JSONDB.classes.DBRef = function(struct) {

	if(typeof(struct) !== 'object'
	|| !(exports.JSONDB.constants.REF_FIELD in struct)
	|| !(exports.JSONDB.constants.ID_FIELD in struct)) {
		throw "illegal object reference";
	}
	
	this.$ref = struct.$ref;
	this.$id = struct.$id;
	
	/**
	 * Returns the collection name for the DBRef instance
	 * @return string
	 */
	this.getCollection = function() {
		return this.$ref;
	};
	
	/**
	 * Returns the BSON Object Identifier for the DBRef instance
	 * @return string
	 */
	this.getObjectId = function() {
		return this.$id;
	};
	
	/**
	 * Resolves the object that the DBRef actually references
	 * @return object/boolean
	 */
	this.resolve = function() {
		var o = exports.JSONDB.objects.Database.getCollection(this.$ref).find({$id:this.$id});
		if(o !== false) {
			return o[0];
		}
		return false;
	};

};

/**
 * A closure representing a series of query expressions that are to be executed against a collection
 * @param query the query expressions to execute
 * @constructor
 */
exports.JSONDB.classes.QueryClosure = function(query) {

	this._query = query;
	
	this._andFunctions = [];
	this._andArguments = [];
	
	this._orFunctions = [];
	this._orArguments = [];
	
	this._updateFunctions = [];
	this._updateArguments = [];
	
	/**
	 * Adds a closure (and arguments) to the call stack
	 * @param closure the closure to add to the stack
	 * @param args the arguments to add for the closure
	 * @return void
	 */
	this.addAndFunction = function(closure, args) {
		this._andFunctions.push(closure);
		this._andArguments.push(args);
	};
	
	/**
	 * Adds a closure (and arguments) to the call stack - executed as part of an $or execution branch
	 * @param closure the closure to add to the stack
	 * @param args the arguments to add for the closure
	 * @return void
	 */	
	this.addOrFunction = function(closure, args) {
		this._orFunctions.push(closure);
		this._orArguments.push(args);
	};
	
	/**
	 * Adds a closure (and arguments) to the call stack - closures in this stack mutate collection data
	 * @param closure the closure to add to the stack
	 * @param args the arguments to add for the closure
	 * @return void
	 */
	this.addUpdateFunction = function(closure, args) {
		this._updateFunctions.push(closure);
		this._updateArguments.push(args);
	};
	
	/**
	 * Executes the call stack of closures against the provided collection
	 * @param collection the collection to execute the call stack against
	 * @return the objects extracted by the query closures
	 */
	this.execute = function(collection) {
		var index = collection.selectIndex(this._query);
		if(index !== false) {
			return index.find(this._query);
		}
		var objects = [];
		var doOrs = this._orFunctions.length > 0;
		for(var key in collection._collection._objects) {
			exports.JSONDB.variables.tcache = {};
			var include = this._evaluate(this._andFunctions, this._andArguments, collection._collection._objects[key]);
			if(doOrs) {
				include = include || this._evaluate(this._orFunctions, this._orArguments, collection._collection._objects[key]);
			}
			if(include) {
				objects.push(collection._collection._objects[key]);
			}
		}
		return objects;
	};

	/**
	 * Executes a series of update closures against the provided objects
	 * @param objects the objects to mutate
	 * @param upsert a flag telling the call stack whether or not to perform an upsert in the event of a mission object parameter
	 * @return boolean
	 */
	this.executeUpdate = function(objects, upsert) {
		var l = objects.length;
		for(var i=0; i < l; i++) {
			this._evaluateUpdate(this._updateFunctions, this._updateArguments, objects[i], upsert);
		}
		return true;
	};

	this._evaluate = function(funcs, args, tuple) {
		var l = funcs.length;
		for(var i=0; i < l; i++) {
			if(funcs[i](args[i][0], args[i][1], tuple) == false) {
				return false;
			}
		}
		return true;
	};
	
	this._evaluateUpdate = function(funcs, args, tuple, upsert) {
		var i=0;
		funcs.forEach(function(f) {
			f(args[i][0], args[i][1], tuple, upsert);
			i++;
		});
	};

};

/**
 * Compiles a QueryClosure instance used specifically to traverse collection data
 * @constructor
 */
exports.JSONDB.classes.QueryCompiler = function() {

	this._cache = {};
	
	/**
	 * Compiles the QueryClosure instance for the provided list of expressions and returns it
	 * @param query the list of query expressions
	 * @return QueryClosure
	 */	
	this.compile = function(query) {
		var closure = new exports.JSONDB.classes.QueryClosure(query);
		this._compile(query, closure, false);
		return closure;
	};

	this._compile = function(query, closure, or) {
		for(var key in query) {
			var value = query[key];
			switch(typeof(value)) {
				case 'object':
					if(key == exports.JSONDB.variables.$or) {
						this._compile(value, closure, true);
					} else {
						for(var func in value) {
							switch(func)
							{
								case exports.JSONDB.variables.$eq:
								case exports.JSONDB.variables.$ne:
								case exports.JSONDB.variables.$exists:
								case exports.JSONDB.variables.$size:
								case exports.JSONDB.variables.$within:
								case exports.JSONDB.variables.$gt:
								case exports.JSONDB.variables.$gte:
								case exports.JSONDB.variables.$lt:
								case exports.JSONDB.variables.$lte:
								case exports.JSONDB.variables.$in:
								case exports.JSONDB.variables.$sort:
								case exports.JSONDB.variables.$unset:
								case exports.JSONDB.variables.$inc:
								case exports.JSONDB.variables.$set:
									this._addFunction(closure, exports.JSONDB.functions[func], [key, value[func]], or);
									break;
							}
						}
					}
					break;
				
				default:
					this._addFunction(closure, exports.JSONDB.functions.$eq, [key, value], or);
					break;
			}
		}
	};
	
	this._addFunction = function(closure, func, args, or) {
		if(or) {
			closure.addOrFunction(func, args);
		} else {
			closure.addAndFunction(func, args);
		}
	};

};

/**
 * Factory wrapper that generates a QueryClosure instance used specifically to mutate collection data
 * @constructor
 */
exports.JSONDB.classes.MutateCompiler = function() {

	this._cache = {};
	
	/**
	 * Compiles the QueryClosure instance for the provided list of expressions and returns it
	 * @param updates the list of update expressions
	 * @return QueryClosure
	 */
	this.compile = function(updates) {
		var closure = new exports.JSONDB.classes.QueryClosure(updates);
		this._compile(updates, closure);
		return closure;
	};

	this._compile = function(updates, closure) {
		for(var key in updates) {
			switch(key)
			{
				case exports.JSONDB.variables.$unset:
				case exports.JSONDB.variables.$inc:
				case exports.JSONDB.variables.$set:
					for(var skey in updates[key]) {
						var args = [];
						args.push(skey);
						args.push(updates[key][skey]);
						closure.addUpdateFunction(exports.JSONDB.functions[key], args);
					}
					break;
			}
		}
	};

};

/**
 * Query expression closures below
 */
exports.JSONDB.functions.$eq = function(a, b, c) {
	var v = exports.JSONDB.functions.traverse(a, c);
	if(v === undefined) {
		return false;
	}
	if(b instanceof RegExp || typeof(b) == 'function') {
		if(typeof(v) !== 'string') {
			v = new String(v);
		}
		return v.match(b) !== null;
	} else if(typeof(v) =='object' && (v instanceof Array)) {
		for(var i=0; i < v.length; i++) {
			if(b == v[i]) {
				return true;
			}
		}
		return false;
	} else {
		return v == b;
	}
};

exports.JSONDB.functions.$ne = function(a, b, c) {
	var v = exports.JSONDB.functions.traverse(a, c);
	if(v === undefined) {
		return false;
	}
	if(b instanceof RegExp || typeof(b) == 'function') {
		if(typeof(v) !== 'string') {
			v = new String(v);
		}
		return v.match(b) == null;
	} else if(typeof(v) =='object' && (v instanceof Array)) {
		for(var i=0; i < v.length; i++) {
			if(b == v[i]) {
				return false;
			}
		}
		return true;
	} else {
		return v != b;
	}
};

exports.JSONDB.functions.$exists = function(a, yes, b) {
	var v = exports.JSONDB.functions.traverse(a, b);
	if(yes) {
		return v !== undefined;
	}
	return v === undefined;
};

exports.JSONDB.functions.$size = function(a, b, c) {
	var v = exports.JSONDB.functions.traverse(a, c);
	if(v instanceof Array || typeof(v) === 'string') {
		return v.length == b;
	} else {
		var size = 0, key;
		for (key in v) {
			if (v.hasOwnProperty(key)) size++;
		}
	    return b == size;
	}
};

exports.JSONDB.functions.$within = function(a, b, c) {
	var v = exports.JSONDB.functions.traverse(a, c);
	if(!('lat' in v) || !('lng' in v)) {
		return false;
	}
	var d = Math.sqrt(Math.pow(b[0][0] - v.lat, 2) + Math.pow(b[0][1] - v.lng, 2));
	return (d <= b[1]);
};

exports.JSONDB.functions.$gt = function(a, b, c) {
	return exports.JSONDB.functions.traverse(a, c) > b;
};

exports.JSONDB.functions.$gte = function(a, b, c) {
	return exports.JSONDB.functions.traverse(a, c) >= b;
};

exports.JSONDB.functions.$lt = function(a, b, c) {
	return exports.JSONDB.functions.traverse(a, c) < b;
};

exports.JSONDB.functions.$lte = function(a, b, c) {
	return exports.JSONDB.functions.traverse(a, c) <= b;
};

exports.JSONDB.functions.$in = function(a, b, c) {
	var v = exports.JSONDB.functions.traverse(a, c);
	if(typeof(v) !== 'undefined') {
		var l = b.length;
		for(var i=0; i < l; i++) {
			if(b[i] == v) {
				return true;
			}
		}
	}
	return false;
};

exports.JSONDB.functions.$nin = function(a, b, c) {
	return !exports.JSONDB.functions.$in(a, b, c);
};

exports.JSONDB.functions.$or = function(a, b, c) {
	return exports.JSONDB.functions.traverse(a, b) !== undefined;
};

exports.JSONDB.functions.$sort = function(c, a, b) {
	switch(b) {
		case -1: // descending
			exports.JSONDB.functions.debug('exports.JSONDB.functions.$sort: descending, ' + a);
			c.sort(function(v1, v2){return v2[a] - v1[a];});
			break;
		
		case 0: // random
			exports.JSONDB.functions.debug('exports.JSONDB.functions.$sort: random, ' + a);
			exports.JSONDB.functions.shuffle(c);
			break;
		
		case 1: // ascending
			exports.JSONDB.functions.debug('exports.JSONDB.functions.$sort: ascending, ' + a);
			c.sort(function(v1, v2){return v1[a] - v2[a];});
			break;
		
		case 2: // alphabetically
			exports.JSONDB.functions.debug('exports.JSONDB.functions.$sort: alphabetically, ' + a);
			c.sort(function(v1, v2){ 
				if(v2[a] > v1[a]) {
					return -1;
				} else if(v2[a] < v1[a]) {
					return 1;
				} else {
					return 0;
				}
			});
			break;
		
		case 3: //  reverse
			exports.JSONDB.functions.debug('exports.JSONDB.functions.$sort: reverse, ' + a);
			c.sort(function(v1, v2){
				if(v2[a] < v1[a]) {
					return -1;
				} else if(v2[a] > v1[a]) {
					return 1;
				} else {
					return 0;
				}
			});
			break;
	}
};

exports.JSONDB.functions.$set = function(name, value, tuple, upsert) {
	var parts = exports.JSONDB.functions.truncatePath(name);
	if(parts === false) {
		exports.JSONDB.functions.$_upsert(name, value, tuple, upsert, false);
	} else {
		var stuple = exports.JSONDB.functions.traverse(parts[0], tuple);
		exports.JSONDB.functions.$_upsert(parts[1], value, stuple, upsert, false);
	}
}

exports.JSONDB.functions.$unset = function(name, value, tuple, upsert) {
	var parts = exports.JSONDB.functions.truncatePath(name);
	if(parts === false) {
		delete tuple[name];
	} else {
		var stuple = exports.JSONDB.functions.traverse(parts[0], tuple, false);
		delete stuple[name];
	}
}

exports.JSONDB.functions.$inc = function(name, value, tuple, upsert) {
	var parts = exports.JSONDB.functions.truncatePath(name);
	if(parts === false) {
		exports.JSONDB.functions.$_upsert(name, value, tuple, upsert, true);
	} else {
		var stuple = exports.JSONDB.functions.traverse(parts[0], tuple);
		exports.JSONDB.functions.$_upsert(parts[1], value, stuple, upsert, true);
	}
}

exports.JSONDB.functions.$_upsert = function(name, value, tuple, upsert, increment) {
	if(name in tuple) {
		if(increment) {
			tuple[name] += value;
		} else {
			tuple[name] = value;
		}
	} else {
		if(upsert) {
			tuple[name] = value;
		}
	}
};
/**
 * End query expression closures
 */

/**
 * Returns a factoried DBRef instance
 * @param collection the collection name to use for the DBRef
 * @param id the object identifier to use for the DBRef
 * @return DBRef
 */
exports.factoryDBRef = function(collection, id) {
	return new exports.JSONDB.classes.DBRef({$ref:collection, $id:id});
};

/**
 * Returns a factoried JSONDB Collection instance
 * @param name the name of the collection
 * @param secret the secret used in cryptographic operations on collection data
 * @param path the storage location for the collection (if not set defaults to module wide location)
 * @return Collection
 */
exports.factory = function(name, secret, path, override) {
	return exports.JSONDB.objects.Database.getCollection(name, secret, path, override);
};

/**
 * Sets a flag signifying whether or not to log console debug output
 * @param semaphor the flag signifying whether or not to log console debug output
 * @return void
 */
exports.debug = function(semaphor) {
	exports.JSONDB.variables.debug = semaphor;
};

/**
 * Sets the file system path under which JSONDB will store and retrieve collection data. By default this is set to Titanium.Filesystem.applicationDataDirectory
 * @param path the path to use when storing and retrieving collection data
 * @return void
 */
exports.storageLocation = function(path) {
	exports.JSONDB.constants.DEFAULT_FS_DIR = path;
};

/**
 * Prints a debug message to the console, conditionally based on the debug settings for the module
 * @param message the message to log to the console
 * @return void
 */
exports.JSONDB.functions.debug = function(message) {
	if(exports.JSONDB.variables.debug == true) {
		Ti.API.info(message);
	}
};

/**
 * Generates a random number between two numbers
 * @param from the lower threshold of the range
 * @param to the upper threshold of the range
 */
exports.JSONDB.functions.randomFromTo = function(from, to) {
	return Math.floor(Math.random() * (to - from + 1) + from);
};

/**
 * Generates a BSON Object Identifier string
 * @return string
 */
exports.JSONDB.functions.generateBSONIdentifier = function() {
	var ts = Math.floor((new Date()).getTime()/1000).toString(16);
	var hs = Titanium.Utils.md5HexDigest(Titanium.Platform.macaddress).substring(0, 6);
	var pid = exports.JSONDB.functions.randomFromTo(1000, 9999).toString(16);
	while(pid.length < 4) {
		pid = '0' + pid;
	}
	var inc = exports.JSONDB.functions.randomFromTo(100000, 999999).toString(16);
	while(inc.length < 6) {
		inc = '0' + inc;
	}
	return ts + hs + pid + inc;
};

/**
 * Generates a struct in the same format as a MongoDate object
 * @return object
 */
exports.JSONDB.functions.generateMongoDate = function() {
	var t = (new Date()).getTime().toString();
	return {
		'sec': parseInt(t.substring(0, 10)),
		'usec': parseInt(t.substring(10))
	};
};

/**
 * Truncates a given string path expression and returns an array containing the remaining path and the segment truncated
 * @param path the string path expression
 * @return array
 */
exports.JSONDB.functions.truncatePath = function(path) {
	if(path.match(/\./g) === null) {
		return false;
	}
	var chunks = path.split('.');
	var end = chunks.pop();
	return [chunks.join('.'), end]; 
};

/**
 * Traverses an object and extracts a given parameter value corresponding to the provided string path
 * @param path the object attribute path (e.g. "lat.lng")
 * @param object the object to traverse
 * @return mixed
 */
exports.JSONDB.functions.traverse = function(path, object) {
	if(path in exports.JSONDB.variables.tcache) {
		return exports.JSONDB.variables.tcache[path];
	}
	var t = function(p, o) {
		if(o === undefined) {
			return undefined;
		}
		if(p.length == 1) {
			return o[p.pop()];
		} else {
			var idx = p.shift();
			return t(p, o[idx]);
		}
	};
	exports.JSONDB.variables.tcache[path] = t(path.split('.'), object);
	return exports.JSONDB.variables.tcache[path];
};

/**
 * Returns a normalized, JSON encoded string representation of an object
 * @param o the object to serialize
 * @return string
 */
exports.JSONDB.functions.stringify = function(o) {
	var clone = {};
	for(var key in o) {
		if(typeof(o[key]) == 'function') {
			clone[key] = o[key].toString();
		} else {
			clone[key] = o[key];
		}
	}
	return JSON.stringify(clone);
};

/**
 * Randomizes the order of elements in an array
 * @param c the array to randomize
 * @return void
 */
exports.JSONDB.functions.shuffle = function(c) {
    var tmp, current, top = c.length;
    if(top) while(--top) {
        current = Math.floor(Math.random() * (top + 1));
        tmp = c[current];
        c[current] = c[top];
        c[top] = tmp;
    }
};

/**
 * Returns a count of the number of top level attributes in an object
 * @param o the object to count
 * @return integer
 */
exports.JSONDB.functions.sizeOf = function(o) {
    var size = 0, key;
    for (key in o) {
        if (o.hasOwnProperty(key)) size++;
    }
    return size;
};

/**
 * Sorts an object's keys alphabetically and returns a sorted, shallow copy of the object
 * @param object the object to sort and clone
 * @return object
 */
exports.JSONDB.functions.sortObjectKeys = function(object) {
	var o = {};
	var k = [];
	for(var key in object) {
		k.push(key);
	}
	k.sort(function(v1, v2){ 
		if(v2 > v1) {
			return -1;
		} else if(v2 < v1) {
			return 1;
		} else {
			return 0;
		}
	});
	k.forEach(function(i) {
		o[i] = object[i];
	});
	return o;
};

/**
 * Generates an index name given an index definition and a flag signifying if it's a unique index. Index names take the form {attribute_name}{sort order}_{attribute_name}{sort_order}+{type}.
 * For example the index name for definition [x:-1,y:1],false would be x-1_y1+s (where +s identifies the index as "sparse" rather than "unique".
 * @param o the index definition
 * @param unique a flag signifying whether the index is sparse or unique
 * @return string
 */
exports.JSONDB.functions.generateIndexName = function(o, unique) {
	var n = [];
	for(var k in o) {
		if(k == exports.JSONDB.variables.$or) {
			continue;
		}
		n.push(k);
	}
	if(unique == undefined) {
		return n.join('_');
	}
	return n.join('_') + '+' + ((unique == true) ? 'u' : 's');
};

/**
 * Performs a deep clone of an object, returning a pointer to the clone
 * @param o the object to clone
 * @return object
 */
exports.JSONDB.functions.cloneObject = function(o) {
	var c = {};
	for(var a in o) {
		if(typeof(o[a]) == "object") {
			c[a] = exports.JSONDB.functions.cloneObject(o[a]);
		} else {
			c[a] = o[a];
		}
	}
	return c;
}; 

/**
 * Global object references
 */
exports.JSONDB.objects.FilesystemManager = new exports.JSONDB.classes.FilesystemManager();
exports.JSONDB.objects.CryptoProvider = new exports.JSONDB.classes.CryptoProvider();
exports.JSONDB.objects.Database = new exports.JSONDB.classes.Database();
exports.JSONDB.objects.QueryCompiler = new exports.JSONDB.classes.QueryCompiler();
exports.JSONDB.objects.MutateCompiler = new exports.JSONDB.classes.MutateCompiler();

// the object deletion log for collections linked to MongoDB collections
exports.JSONDB.objects.Log = exports.factory('___log', 'repl:C7E7CB377BADE1D68BA0FFBD03347CA18D746817AC50CE407EA40BE5677ACB9D', undefined, true);