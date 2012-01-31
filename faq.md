JSONDB FAQ

## Description

Frequently asked questions about JSONDB - this document is updated as new questions come up.

## Why is there no Android support? (When will Android support be available?)

At the moment Android support is unavailable due to limitations in the Titanium platform. The following JIRA describes the issue:

http://jira.appcelerator.org/browse/TIMOB-4521

As soon as Appcelerator close the above ticket I'll release an Android version of the module.	

## Where can I find documentation and/or code examples?

Documentation and an example application showing practical examples of the module in action are available at the following URL:

https://github.com/irlgaming/jsondb-public

## Can I migrate my application from SQLite to JSONDB?

The process of migrating from SQLite would be dependent on the way your application has been engineered. If you've followed the single execution context approach recommended by Appcelerator (and demonstrated in the Tweetanium project - https://github.com/appcelerator-titans/tweetanium/tree/master/mobile/Tweetanium/Resources) then you shouldn't have any problems.

If we assume that your application runs in a single execution contexts then the switch from SQLite should be pretty straight forward. You would simply model your JavaScript objects to store whatever attributes you require and store them in JSONDB collections. I wrote a short blog post demonstrating how JSONDB can be used to handle equivalent SQL queries, it's located here:

http://www.irlgaming.com/misc/migrating-titanium-appcelerator-app-sqlite-jsondb/

## Why does JSONDB only work inside a single execution context?

Because JSONDB is a JavaScript module and uses the device file system to store and retrieve collection data it will only function consistently in a single execution context. That is, if you spawn multiple windows using different execution contexts then you'll end up with different copies of the collections in memory, which will lead to inconsistent commits and ultimately race conditions. More documentation about execution contexts can be found at:

http://developer.appcelerator.com/blog/2010/08/execution-contexts.html

## Are you planning on providing support for use in multiple execution contexts?

We looked at implementing this, but every design we came up with seemed like an anti-pattern. JSONDB is designed for use in single execution context applications.

## What's the performance like? Have you done any comparative benchmarks with SQLite?

I haven't done any comparative benchmarks between SQLite and JSONDB, so I can't give you definitive numbers. We currently use a functionally analogous version of the module in Zombie Hood (http://zombiehoodapp.com), which is a heavily data driven application and I haven't noticed any performance issues (this is anecdotal though).

I've done a bit of performance testing on JSONDB and the number of queries per second you'll be able to squeeze out of it is a function of the complexity of your query expressions, the sorting algorithm used and (most importantly) the size of the collection you're working with. Using collections of less than 300 objects I've observed the module perform up to 500 moderately complex queries employing various sorts in under a second (around 0.7 seconds). The larger the collection the slower the query; I've tested with collections containing up to 1000 records and the system still performs adequately on my 3Gs test device (the same test taking between 1.2 and 1.7 seconds).

If your application requires more performance than that then I'd be very interested in finding out about what you're working on ;-)

## Does JSONDB support indexes?

Yup, JSONDB supports B-tree style indexes. This subject is explained at length in the JSONDBIndex.md document.

## What happened to the dataTampered event?!

This event is now named "JSONDBDataTampered" to maintain consistency with other events fired by the JSONDB module and ensure it doesn't collide with events inside your app (or from other modules).

## How is data stored in JSONDB?

Each collection is stored on disk as a single file, you can think of it as semantically equivalent to a database table although there are some significant differences. Collections represent a group of objects rather than rows.

Starting with version 2.0 of the module you're also able to tell JSONDB where on disk you'd like your collection data stored.

## What's the difference between save() and commit()?

Saving an object into a collection adds it to the in-memory data structure and assigns a unique BSON identifier to it. Committing the collection stores the serialized JSON version of the collection to storage. In database terms you can think of it as beginning a transaction (or series of transactions) which are then committed to the database once they're completed. You can also force JSONDB to auto-commit after each transaction on a per-collection basis.

## Can I use JOINS and VIEWS?

Joins (and foreign key constraints) aren't actually supported in NoSQL systems, you can link between collections using DBRef instances though. A DBRef is an object property that specifies the collection to link to and which object in that collection should be referenced. JSONDB allows you to resolve these linked objects, however you can't perform complex joins in the same way you can with SQL based systems.

## Can I use iTunes file sharing to perform backups and restores?

I'm not familiar with using iTunes file sharing to perform backups, but if you're just backing up your SQLite database files to online storage then there's no reason you can't also do that with JSONDB files. To restore you'd download the collection files to the original location and everything would auto-magically work. We currently replicate our collections from user's handsets to a remote MongoDB replica set in production.

## Can I connect JSONDB to the MongoLab REST API?

Yes, you can. This subject is documented at length in the mongolab.md document.

## How do I change my schema or migrate data between releases?

NoSQL databases really have no structure or schema, you can put objects of any structure into the same collection and perform queries on them in the same way. Rather than me attempting an explanation on how schema-less databases work it's probably better if I provide some articles on the subject:

* http://en.wikipedia.org/wiki/NoSQL
* http://www.mongodb.org/display/DOCS/Schema+Design
* http://blog.mongodb.org/post/119945109/why-schemaless
* http://effectif.com/mongodb/mongodb-schema-design

The simple answer is: you don't need to change your DB structure between updates because there is no schema. You can store and retrieve data of any type in any way you like - adding new attributes is as easy as just setting a property on an object. So, for example, if you wanted to add a property called "foo" to each object in a collection named "objects" you would use code similar to the following:

``` javascript
var collection = jsondb.factory("objects", "mysharedsecret");
collection.update({}, {$set:{foo:"bar"}}, {}, true);
collection.commit();
```

## What algorithm does JSONDB use to determine geo-spatial proximity?

The system currently uses the fast distance threshold formula to determine whether or not co-ordinates stored in objects are within a given radial distance from the co-ordinates provided in the query expression. This formula uses a square root calculation, so it's not particularly efficient for large data sets. The formula does not respect spherical geometry so it becomes less accurate at larger distances.

## I'm getting weird errors about Ti.Filesystem and/or Ti.Utils!

The JSONDB module uses Ti.Filesystem to store and retrieve data. What I think is happening is that the symbols referencing Ti.* Kroll classes aren't being resolved when Titanium loads the external JavaScript library. I would say that that's probably a quirk of the way the JavaScript to native bridge stuff works with interpreted code loaded at run time rather than when the app bootstraps.

At the beginning of your app.js file try adding the following two lines:

``` javascript
Ti.API.info(Ti.Utils.sha1("testing"));
Ti.API.info(Ti.Filesystem.applicationDataDirectory);
```

That should force Titanium to resolve the required symbols before they're referenced in the JSONDB library.

## Can JSONDB handle large datasets (4000+ records)?

Yup, although your mileage may vary. How JSONDB will perform under these conditions will depend on the way you organize your data, the complexity of the queries you perform, the family of device running the code and just how much data you have in your collections.

I've tested with collections containing up to 20,000 records, and on my 3Gs test device I've seen query times off around 833 milliseconds for integer keys (e.g. collection.count({i:3})) and around 1.4 seconds for regular expression based fuzzy searches (e.g. collection.count({term:/^[af]/})). That's not blazingly fast, but then again this is a fairly extreme use case for the module.

You can test the code yourself in the simulator and on your devices if you have a copy of the JSONDB module, or just examine my test rationale:

https://github.com/irlgaming/jsondb-public/blob/master/app2.js

Since JSONDB caches all collection data in memory at runtime you might run into memory starvation issues if your collections are exceptionally large.

## I'm getting weird errors about a missing armv6 slice!

Grab the latest version of the module from the Open Marketplace and it should fix this issue.

## Can I have the JSONDB source code?

Starting with v2.0 of the module we'll be distributing the source to licensed users (on request).

## Why are you charging $15 USD for JSONDB? Are there any coupon codes?

When you buy a license to the JSONDB module what you're really buying is exclusive access to the top of our email queue. If you've got a JSONDB related issue you can email us any time and we'll get back to as soon as possible.

We work really hard to develop, maintain and support this module but we also need to pay our bills - so we don't think fifteen clams is all that much to ask for an unlimited license with no seating restrictions and unlimited support (within reason).

JSONDB is closed source (although we provide the module source to license holders on request) and we do not provide discount coupons on the Appcelerator Open Marketplace.

## If I buy a license can I extend JSONDB and redistribute the source under a different license?

Nope. If you find bugs in the JSONDB source or want a particular feature please log a ticket at http://support.irlgaming.com/home and we'll address it. Don't worry, we'll take your ticket seriously and roll out a fix as soon as humanly possible.

If you're having trouble getting a response email ohlo@irlgaming.com and it'll make somebody's phone beep.

## Isn't JSONDB pretty much the same as TaffyDB?

Nope, we didn't even known TaffyDB existed until someone tweeted about it. You can find the project here:

* http://taffydb.com/
* https://github.com/typicaljoe/taffydb

There are some fairly significant differences between TaffyDB and JSONDB - the most important  being that JSONDB was engineered for use in Titanium Applications (rather than the web) that leverage MongoDB on the server side. We haven't tried integrating TaffyDB with our Appcelerator apps, but there's a project on Github doing just that, you can find it at the following location:

https://github.com/mpociot/ti-taffy

## Author

Daniel Eyles, IRL Gaming
dan@irlgaming.net

## License

See LICENSE file included in this distribution.
