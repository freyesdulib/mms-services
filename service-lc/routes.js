'use strict';

var Lc = require('../service-lc/controller');

module.exports = function (app) {

    app.route('/v3/vocabs/lc/:type/:term') // available types == "names" or "subjects"
        .get(Lc.getLcTerms);
};


