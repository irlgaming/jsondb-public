JSONDB Indexes

## Description

This document describes indexes within the context of JSONDB collection objects.

## What index types are supported in JSONDB?

At the moment JSONDB only supports B-tree(ish) indexes. If you don't know what a B-tree is or how it might be used as part of an indexing strategy then read the following:

http://en.wikipedia.org/wiki/B-tree

B-tree indexes in the context of JSONDB have no block size limitation and are stored entirely in memory. In fact, indexes are never stored on disk and are rebuilt every time a collection is loaded into memory.

This also means you'll need to define your indexes every time you bootstrap your JSONDB collections, which is simply of a matter of adding a few lines of code. For example:

``` javascript
var global = {
	collections = {}
};
global.collections.documents = jsondb.factory('documents','yoursecretkey');
global.collections.documents.ensureIndex({i:-1}); // create an index of the attribute key "i" in descending order
```

Compound indexes can contain any number of keys using any different combination of sorts. Indexes are, however, limited to scalar values and will not index objects or arrays.

Attempting to include arrays or objects in indexes will result in the objects they are encapsulated by being excluded from the index (and by extension the results of your queries).

## How can B-tree indexes be used to improve performance?

Indexes can provide a significant performance improvement when applied judiciously. For example, to optimize queries against a collection containing objects including three attributes with integer values you might define the following index:

``` javascript
var global = {
	collections = {}
};
global.collections.documents = jsondb.factory('documents','yoursecretkey');
global.collections.documents.ensureIndex({x:-1, y:-1, z:-1});
```

The code above would create a B-tree index on the keys "x", "y", and "z" - all in descending order. Any queries utilizing those three keys (in any order) will be significantly faster.

Indexes can also be created on nested keys: 

``` javascript
global.collections.documents.ensureIndex({'loc.lat':-1, n:1}); // create an index on loc.lat descending, n ascending
```

## What are the caveats?

There are a few.

Firstly, B-tree indexes aren't particularly efficient for series containing large numbers of unique values (e.g. 4000 objects containing an attribute "i" with 4000 unique values).

Secondly, indexed collections require more memory (how much depends on what you're indexing, how many objects your collections contain and how complex your indexes are).

Thirdly, indexes add some computational overhead to operations that mutate collections. In simple terms - changing data means you have to change indexes. Once again, this overhead is a function of the size of your collections and the complexity of your indexes.

## So how much faster are queries on indexed collections?

Lots... but it depends. Doing fuzzy regexp searches on string attributes probably won't be that much faster unless the range of possible values is fairly small.

Performing queries against large collections (10,000+ objects) that are properly indexed can reduce query times signficantly (in the order of 10 to 20 times faster).

If you think about it logically an index on a series with a range of 30 unique values on a collection with 10,000 objects will mean scanning 30 index keys rather than 10,000 object attributes - using an index will obviously be faster.

## Why didn't you also implement Unique Indexes?

JSONDB collections DO include a single unique index on the $id attribute. I had a look at writing code to support unique indexes on other object attributes (including compounding indexes).

I even had a working prototype in place, but I didn't have enough time to finish the code to support unique constraints on collections. This might be something I'll support in subsequent releases.
