'use strict';

var Local = require('../local-service/controller');

module.exports = function (app) {

    app.route('/api/v3/vocabs/local/creators')
        .get(Local.getLocalCreators);

    app.route('/api/v3/vocabs/local/art_types')
        .get(Local.getArtTypes);

    app.route('/api/v3/vocabs/local/time_periods')
        .get(Local.getTimePeriods);

    app.route('/api/v3/vocabs/local/sources')
        .get(Local.getLocalSources);

    app.route('/api/v3/vocabs/local/instructors')
        .get(Local.getInstructors);

    app.route('/api/v3/vocabs/index')
        .post(Local.indexVocabs);
};