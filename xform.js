yaml = require('js-yaml');
fs   = require('fs');
var data = require('./sample.json');

// Get document, or throw exception on error
var doc = yaml.safeLoad(data, fs.readFileSync('./humanapi_mapping.yml', 'utf8'));
console.log(doc);
