JSONDB MongoLab integration

## Description

JSONDB integration with MongoLab REST API services.

## What's MongoLab?

MongoLab is a nifty service that provisions hosted MongoDB instances on various different cloud based hosting providers. You can check out their website at the following URL:

http://mongolab.com

If you want to give their service a go you can sign up and provision a free MongoDB instance with up to 240MB of storage. They take care of all the annoying stuff like sharding, monitoring and back-ups.

## Why would I want to integrate JSONDB with MongoLab?

Good question. The short answer is because it allows you to persist your collection data online - this opens up a lot of interesting avenues for app developers.

## How does JSONDB integrate with the MongoLab?

JSONDB now includes a connector for the MongoLab REST API that allows developers to load data from collections and save data back to them asynchronously.

To find out more about the MongoLab REST API check out the documentation at the following URL:

http://support.mongolab.com/entries/20433053-rest-api-for-mongodb

Using JSONDB with MongoLab is pretty simple. Before you can start you need to sign up for an account with MongoLab and get yourself an API key as described in the FAQ at the following URL:

https://mongolab.com/about/faq/

Once you've got a MongoLab API key, create a database and a couple of collections to store your data in. Let's say your database is called "test" and your first collection is called "documents".

In your application JavaScript code instantiate a JSONDB collection like you normally would:

``` javascript
var collection = jsondb.factory('test:documents','mysecretkey');
```

You'll notice that the collection name is delimited by a colon. The first segment of the collection name should be the same as the name of your database (in this case "test"), the second segment of the collection name should be the same as the name of your collection (in this case "documents").

Next up you'll need to initialize the MongoLab API connector for JSONDB:

``` javascript
var hostname = 'api.mongolab.com';
var api_key  = 'yourmongolabapikey';
collection.initializeAPI(hostname, api_key);
```

You'll need to provide the host name for the MongoLab API (by default api.mongolab.com) and the API key provided by MongoLab.

Now you're ready to go. To load in data from you hosted MongoDB collection you can use the following code:

``` javascript
collection.API.load();
```

If you only want to load a subset of the documents in the collection you can provide a query expression object when you initialize the MongoLab API connector:

``` javascript
var hostname = 'api.mongolab.com';
var api_key  = 'yourmongolabapikey';
collection.initializeAPI(hostname, api_key, {user_id:123456789});
collection.API.load();
```

The code above will only load in objects from the collection with an user_id attribute with a value of "123456789". This might be useful if you want to store all user specific data in a single collection but only load in objects pertinent to the current user.

Once the data is loaded from the API the JSONDB module will fire a "JSONDBDownloadSuccess" event which your application will be able to trap. Once this event has been fired you're able to work with the data stored inside your collections. In the event of an error the JSONDB module will fire a "JSONDBDownloadSuccess" event.

Synchronizing data back to MongoDB is simple:

``` javascript
collection.API.save();
```

If the upload was a success the JSONDB module will fire a "JSONDBUploadSuccess" event, otherwise it will fire a "JSONDBUploadError" event.

JSONDB keeps an internal log of any objects you've deleted from your collections while they're connected to a MongoDB collection and asychronously deletes them from your MongoDB collections when you successfully complete an upload to the MongoLab REST API. This log collection persists between application loads and purges itself as deletions are confirmed by the MongoLab REST API.

A full example of using the JSONDB MongoLab connector to operate on data is provided below:

``` javascript
var jsondb = require('com.irlgaming.jsondb');
jsondb.debug(true);

var globals = {
	collections: {},
	loaded: {}
};

Ti.App.addEventListener("JSONDBDataTampered", function(event) { Ti.API.info(event); });

Ti.App.addEventListener("JSONDBDownloadSuccess", function(event) {
	globals.collections[event.collection_name].ensureIndex({x:-1}); // create an index on your newly loaded collection 
	globals.loaded[event.collection_name] = true;
	// do whatever you like with your JSONDB collection
});

Ti.App.addEventListener("JSONDBUploadError", function(event) {
	// handle any error conditions here
});

globals.collections.documents = jsondb.factory('test:documents','mysecretkey');

// you might only wish to do the following if the collection is empty
globals.collections.documents.initializeAPI('api.mongolab.com','yourmongolabapikey');
globals.collections.documents.API.load();
```

## Will JSONDB modify indexes on my MongoDB collections?

Nope. Indexes are not preserved between JSONDB and MongoDB (or vice-versa).

## If I have existing data in a JSONDB collection and connect it with a MongoDB collection via MongoLab will I lose my data?

No, JSONDB will merge your local data with the collection downloaded from the MongoLab API. In the event that any ObjectId values collide the remote data will over-write your local data... this should only ever happen if you have previously pulled objects from a MongoDB collection with the same ObjectId values.