'use strict';

var Indexer = require('../service-indexer/controller');

module.exports = function (app) {

    app.route('/api/v3/real-time-index')
        .post(Indexer.realTimeIndex);

    app.route('/v3/ah/index')
        .post(Indexer.indexAh);

    app.route('/v3/ah/create')
        .post(Indexer.createAhIndex);

    app.route('/v3/full-index')
        .post(Indexer.fullIndex);

    app.route('/v3/vocabs/index')
        .post(Indexer.indexVocabs);

    app.route('/v3/vocabs/index/record')
        .post(Indexer.indexVocabRecord);

    app.route('/v3/vocabs/index/delete')
        .post(Indexer.deleteIndex);

    app.route('/v3/vocabs/index/create')
        .post(Indexer.createIndex);

    app.route('/v3/vocabs/mapping/create')
        .post(Indexer.createMapping);
};