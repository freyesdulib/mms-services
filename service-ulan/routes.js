'use strict';

var Ulan = require('../service-ulan/controller');

module.exports = function (app) {

    app.route('/api/v3/vocabs/ulan/creators')
        .get(Ulan.getUlanCreatorsWS);

    app.route('/api/v3/vocabs/ulan/creators/id')
        .get(Ulan.getUlanCreatorWS);

};