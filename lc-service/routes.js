'use strict';

var Lc = require('../lc-service/controller');

module.exports = function (app) {

    app.route('/api/v3/vocabs/lc/:type/:term') // available types == "names" or "subjects"
        .get(Lc.getLcTerms);
};


