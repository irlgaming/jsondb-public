# JSONDB Module

## Description

JSONDB is a module that allows you create, query and store collections of Javascript objects in your iOS applications. All data managed by JSONDB is secured from tampering
once committed to storage. JSONDB provides an advanced NoSQL query interface allowing traversal, retrieval, mutation and sorting of objects within collections.

The module also provides an implementation of DBRef allowing references to objects between collections, include automated resolution of linkages.

It should be noted that the collection objects within this module are not thread safe and should only be accessed within a single memory context.

## Accessing the JSONDB Module

To access this module from JavaScript, you would do the following:

	var jsondb = require("com.irlgaming.JSONDB");

The JSONDB variable is a reference to the Module object.	

## Reference

Following is a reference for the JSONDB API. A comprehensive set of working examples can be found in the sample application distributed with this module.

### jsondb.debug(flag[boolean])

The debug function allows calling agents to specify whether or not query debug output should be emitted to the Titanium console. The value passed to this function should boolean, the default is false.

### jsondb.storageLocation(path[string])

Sets the module wide storage location for JSONDB collection data, this setting can over-ridden at the collection level. By default this is set to Titanium.Filesystem.applicationDataDirectory

See http://developer.apple.com/icloud/documentation/data-storage/ for implementation details on where to store you application data.

### jsondb.factory(name[string], secret[string], path[string])

This function factories a JSONDB collection object. If a stored version of the collection currently resides on disk it will automatically be loaded, otherwise a file will be created.

* name[string, required]: the name of the collection to instantiate
* secret[string, required]: the shared secret used to secure data on disk
* path[string, optional]: the file system location used to store collection data. If not specified this falls back to the global setting for the module, default is Titanium.Filesystem.applicationDataDirectory at the module level.

## Usage

	var $collection = jsondb.factory("test","yoursharedsecrethere");

## Exceptions

If the signature stored with the data does not match the signature calculated when the collection is loaded the module with return a boolean value of FALSE and fire a JSONDBDataTampered event.
The implementing application is then able to handle this event internally (e.g. display a message to the user telling them that application data has been tampered with).

### jsondb.factoryDBref(collection[string], id[string])

This function factories a JSONDBRef object allowing linking between collections

* collection[string, required]: the name of the collection to link against (must already exist)
* id[string, required]: the BSON ID of the object in the collection to link against

## Usage

	var $ref = jsondb.factoryDBRef("test", "yourobjectsid");

## Author

Dan Eyles, IRL Gaming
dan@irlgaming.com

## License

See LICENSE file included in this distribution.