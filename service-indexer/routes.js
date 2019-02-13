'use strict';

var Indexer = require('../service-indexer/controller');

module.exports = function (app) {

    app.route('/api/v3/real-time-index')
        .post(Indexer.realTimeIndex);

    app.route('/api/v3/full-index')
        .post(Indexer.fullIndex);
};