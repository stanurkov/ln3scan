# ln3scan


[![MIT][mit-image]][mit-url]

> Custom, simple, extendable internationalization module for JavaScript applications


[mit-image]: https://github.com/stanurkov/observed-object/blob/master/mit.svg
[mit-url]: https://github.com/stanurkov/ln3scan/blob/master/LICENSE


## Introduction

ln3scan is an utility for automatic grabbing strings for ln3-based translation from JavaScript projects and making them available for translation in the form of JSON files


#### Installation

From the root of your project:

```sh
npm install ln3scan
```

To make it available from any place:

```sh
npm install -g ln3scan
```

#### Usage

```sh
ln3scan [directory] [--output translations_directory] [--file translation_module_name]
```

This will generate a translation module ( "ln3setup.js" is the default name) ready to be used in your project together with ln3 package in one of your project file (it is advised to put it into the module that loads earlier than others):

```
import ln3 from 'ln3';
import "./ln3/ln3setup";
```

To add generation for a new language, simply put an empty file named as <Language_ID>.json into the output directory, it will be filled with the default strings prefixed with !! (double exclamation mark) after the scan
