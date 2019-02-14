'use strict';

var Indexer = require('../service-indexer/controller');

module.exports = function (app) {

    app.route('/api/v3/real-time-index')
        .post(Indexer.realTimeIndex);

    app.route('/api/v3/full-index')
        .post(Indexer.fullIndex);

    app.route('/api/v3/vocabs/index')
        .post(Indexer.indexVocabs);

    app.route('/api/v3/vocabs/index/record')
        .post(Indexer.indexVocabRecord);

    app.route('/api/v3/vocabs/index/delete')
        .post(Indexer.deleteIndex);

    app.route('/api/v3/vocabs/index/create')
        .post(Indexer.createIndex);

    app.route('/api/v3/vocabs/mapping/create')
        .post(Indexer.createMapping);
};