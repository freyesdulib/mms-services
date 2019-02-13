'use strict';

var Local = require('../service-local/controller');

module.exports = function (app) {

    app.route('/api/v3/vocabs')
        .get(Local.getServiceInfo);

    app.route('/api/v3/vocabs/local/creators')
        .get(Local.getLocalCreators);

    app.route('/api/v3/vocabs/local/art_types')
        .get(Local.getArtTypes);

    app.route('/api/v3/vocabs/local/time_periods')
        .get(Local.getTimePeriods);

    app.route('/api/v3/vocabs/local/instructors')
        .get(Local.getInstructors);

    app.route('/api/v3/vocabs/local/sources')
        .get(Local.getLocalSources);

    app.route('/api/v3/vocabs/local/sources/save')
        .post(Local.saveLocalSources);

    app.route('/api/v3/vocabs/index')
        .post(Local.indexVocabs);

    app.route('/api/v3/vocabs/index/delete')
        .post(Local.deleteIndex);

    app.route('/api/v3/vocabs/index/create')
        .post(Local.createIndex);

    app.route('/api/v3/vocabs/mapping/create')
        .post(Local.createMapping);
};