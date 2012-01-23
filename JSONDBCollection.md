# jsondb Module

## Description

A JSONDB collection object

## Properties

### API

The API property holds a pointer to the MongoLab REST API connector for the collection (if it has been initialized). The connector object has two functions:

* load: loads data from the MongoLab REST API
* save: saves data back to the MongoLab REST API

The implementation details for the MongoLab REST API connector are provided in the mongolab.md document.

## Functions

Following is a reference for the JSONDBCollection class. A comprehensive set of working examples can be found in the sample application distributed with this module.

### open()

Loads the collection data from disk.

#### Properties

None

#### Exceptions

If the signature stored with the data does not match the signature calculated when the collection is loaded the module with return a boolean value of FALSE and fire a dataTampered event.
The implementing application is then able to handle this event internally (e.g. display a message to the user telling them that application data has been tampered with).

### setAutoCommit(flag[boolean])

Tells the collection whether or not to automatically commit data to disk. By default auto-commit is set to false.

#### Properties

* flag[boolean, required]: a boolean value signifying whether or not auto-commit is enabled

#### Exceptions

None

### sizeOf()

Returns the length of the collection as an integer value

#### Properties

None

#### Exceptions

None

### getLastInsertId

Returns the ObjectID for the last object inserted into the collection

#### Properties

None

#### Exceptions

None

### initializeAPI(host[string], key[string], query[object])

Initializes the MongoLab API connector for the collection. This allows you to load documents from a MongoDB collection hosted by MongoLab, the API connector also allows your application to synchronize changes back to the MongoDB collection hosted by MongoLab.

#### Properties

* host[string, optional]: a string specifying the API host to connect to, by default this is set to api.mongolab.com
* key[string, required]: your MongoLab API key
* query[object, optional]: a query expression object used to filter which objects are returned by the MongoDB collection

#### Exceptions

None

### ensureIndex(definition[object])

Creates a B-tree index on the JSONDB collection using the definition provided. Definition objects are represented by a series of key, value pairs with the key representing the object attribute to index and value representing the intended sort order. And example of the usage of this function might be:

``` javascript
var collection = jsondb.factory('documents', 'yoursecretkey');
collection.save({
	x: 2,
	y: 3	
});
collection.ensureIndex({x:-1, y:1});
```

This block of code would create an index on the "documents" collection, indexing "x" in descending order and "y" in ascending order. More documentation on indexes can be found in the JSONDBIndex document.

#### properties

* definition[object, required]: the index definition

#### Exceptions

None

### dropIndex(definition[object])

Drops a B-tree index from the JSONDB collection using the definition provided. Definition objects are represented by a series of key, value pairs with the key representing the object attribute to index and value representing the intended sort order. And example of the usage of this function might be:

``` javascript
var collection = jsondb.factory('documents', 'yoursecretkey');
collection.dropIndex({x:-1, y:1});
```

#### Properties

* definition[object, required]: the index definition

#### Exceptions

None

### clear()

Removes all objects from the collection

#### Properties

None

#### Exceptions

None

### commit()

Commits all changes to the collection to disk.

#### Properties

None

#### Exceptions

None

### getAll()

Returns all objects contained within the collection as an array

#### Properties

None

#### Exceptions

None

### save(value[object])

Adds the provided object to the collection. If no $id property exists it will be generated and added to the object in accordance with the BSON ObjectID specification. Objects added to the collection will no be committed to disk until the commit function is called (unless auto-commit is enabled)

#### Properties

* value[object, required]: the object to store in the collection

#### Usage

	collection.save({name:"my new object", value:12345});

### Exceptions

None

### find(query[object], conditions[object])

Traverses the collection and returns a list of objects matching the provided query predicates and conditions

#### Properties

* query[object, required]: the query parameters
* conditions[object, optional]: the conditions for the result set

#### Usage

The find function gives your application the ability to perform complex queries on the collection, as well as modifying the results returned. Detailed examples of how powerful this function is, and how it should be used are provided in the example application distributed with this module. Below is a quick overview of how the function should be used.

The query expression object can be thought of as similar to an SQL WHERE clause. It can be used to perform simple of complex queries at any level of the objects within the collection.

The structure of the query expression object is as follows:

``` javascript
{
	[the name of the object property to query on]: {
		[the query expression to use]:[the value to query with]
	}
}
```

For example, to retrieve all objects within the collection containing an object property called "i" with a value less than or equal to "5" would look like:

``` javascript
{
	i:{
		$lte:5
	}
}
```

Query expressions can be compounded in the same object (think of it as an AND clause) or combined conditionally using the $or expression. For example to retrieve all objects within the collection containing objects where i is less than or equal to 5 and greater than or equal to 2:

``` javascript
{
	i:{
		$lte:5,
		$gte:2
	}
}
```
To retrieve all objects within the collection containing objects where i is less than or equal to 5 and greater than or equal to 2, or have a name matching the provided regular expression:

```javascript
{
	i:{
		$lte:5,
		$gte:2
	},
	$or:{
		name:/[^a-zA-Z0-9]/
	}
}
```

Supported expressions within the query object are as follows:

* $eq: compares the object value for equivalency. This expression is the default applied to query expression object properties and can also use regular expressions. 
   * var o = collection.find({i:{$eq:5}});
   * var o = collection.find({i:5});
   * var o = collection.find({name:/^a+/});

* $ne: compares the object value for inequivalence (whether or not the objects are not equal to one another)
   * var o = collection.find({i:{$ne:3}});
   * var o = collection.find({name:/^b+/})

* $lte: compares the object value to see if it is less than or equal to the provided value
   * var o = collection.find({i:{$lte:5}});

* $lt: compares the object value see if it is less than the provided value
   * var o = collection.find({i:{$lt:5}});

* $gte: compares the object value to see if it is greater than or equal to the provided value
   * var o = collection.find({i:{$gte:5}});

* $gt: compares the object value to see if it is greater than the provided value
   * var o = collection.find({i:{$gt:5}});

* $exists: evaluates whether or not an object property exists (or vice-versa)
   * var o = collection.find({i:{$exists:true}})

* $size: evaluates whether or not the object property has a length matching the provided value. Works for scalar values, arrays, and objects.
   * var o = collection.find({n:{$size:2}});

* $in: evaluates whether not the object property has a value in the provided array
   * var o = collection.find({i:{$in:[1, 2, 3, 4, 5]}});

* $within: evaluates whether or not objects fall within a given geo-spatial area defined by a center-point and radius. To take advantage of this feature your object property must be an object with "lat" and "lng" properties.
   * var o = collection.find({loc:{$within:[[5, 5], 0.9]}});

The query conditions object provides a facility for mutating the result set of the query by allowing sorting and limit. The conditions expression object uses the same format as the query expression object. Supported expressions within the condition object are as follows:

* $limit: the integer limit for the query
   * var o = collection.find({i:{$gte:5}}, {$limit:10});

* $sort: the sorting algorithm to apply to the result set. Possible values are as follows:
   * -1: descending order
   * 0: randomized order
   * 1: ascending order
   * 2: alphabetic order
   * 3: reverse order
   * var o = collection.find({i:{$gte:5}}, {$sort:{i:-1}});

Conditions can be combined, for example:

	var o = collection.find({i:10}, {$limit:10, $sort:{j:0}});

#### Exceptions

None

### count(query[object])

Same as the find function (minus the conditions object), however rather than returning a list of objects it return an integer value representing the length of the result set. You can find of this as a COUNT clause in SQL

#### Properties

* query[object, required]: see the "find" function

#### Usage

	var c = collection.count({i:10, j:2, name:/chicken/}); // count objects where i equals 10, j equals 20 and name matches the provided regular expression
	
#### Exceptions

None

### update(query[object], updates[object], conditions[object], upsert[boolean])

Updates objects with the collection, kind of like an SQL UPDATE clause.

#### Properties

* query[object, required]: see the "find" function
* updates[object, required]: the update expressions to apply to mutate the collection
* conditions[object, optional]: see the "find" function
* upsert[boolean, optional]: a flag telling the collection whether to create the object property if update clauses don't match

#### Usage

Query and condition expression objects are the same as the __find__ function.

The update function gives your application the ability to perform complex updates on the collection. Detailed examples of how powerful this function is, and how it should be used are provided in the example application distributed with this module. Below is a quick overview of how the function should be used.

The update expression object can be thought of as similar to an SQL UPDATE clause. It can be used to perform simple of complex updates at any level of the objects within the collection.

The structure of the query expression object is as follows:

``` javascript
{
	[the update expression]: {
		[the object property to update]:[the value to update with]
	}
}
```

For example, to retrieve all objects within the collection containing an object property called "i" with a value less than or equal to "5" would look like:

``` javascript
{
	$inc:{
		i:5
	}
}
```

Supported expressions within the update object are as follows:

* $inc: increments the specified object property by the provided amount
   * collection.update({i:5, j:3}, {$inc:{a:3}}, {$limit:10}, false); // increments the property a by 3 for all objects where i equals 5 and j equals 3. Limits the update to the first 10 objects matched and does not upsert

* $set: sets the specified object property to the provided value
   * collection.update({i:2}, {$set:{j:3}}); // set j to 3 where i equals 2

* $unset: removes the specified object property
   * collection.update({i:2}, {$unset:{j:true}}); // removes the property j from all objects where i equals 2

#### Exceptions

None

### remove(query[object], conditions[object])

Same as the find function, however rather than returning a list of objects it removes all objects matching the query expression and conditions (if provided). You can find of this as a DELETE clause in SQL

#### Properties

* query[object, required]: see the "find" function
* conditions[object, optional]: see the "find" function

#### Usage

	var o = collection.remove({i:10}); // remove all objects where i is equal to 10

#### Exceptions

None

## Author

Daniel Eyles, IRL Gaming
dan@irlgaming.net

## License

See LICENSE file included in this distribution.