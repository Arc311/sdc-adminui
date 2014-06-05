var Collection = require('./collection');
var FWRule = require('./fwrule');
var FWRules = Collection.extend({
    model: FWRule,
    url: function() {
        return '/api/fw/rules';
    }
});

module.exports = FWRules;
