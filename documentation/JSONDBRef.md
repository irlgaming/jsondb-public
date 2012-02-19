# jsondb Module

## Description

A JSONDBRef object. For more information about the DBRef standard see http://www.mongodb.org/display/DOCS/Database+References

## Functions

Following is a reference for the JSONDBRef class. A comprehensive set of working examples can be found in the sample application distributed with this module.

### resolve()

Resolves the linked object from the references collection

#### Properties

* $ref[string]: the name of the references collection
* $id[string]: the BSON identifier for the linked object in the referenced collection

#### Usage

``` javascript
object = {
	name: "value",
	ref: jsondb.factoryDBRef("test", "4ec1d9b58436d00a100c61e6")
};
var o = object.ref.resolve();
```
#### Exceptions

## Author

Daniel Eyles, IRL Gaming
dan@irlgaming.net

## License

See LICENSE file included in this distribution.