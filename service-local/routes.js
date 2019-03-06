'use strict';

var Local = require('../service-local/controller');

module.exports = function (app) {

    app.route('/api/v3/vocabs')
        .get(Local.getServiceInfo);

    app.route('/api/v3/vocabs/local/creators')
        .get(Local.getLocalCreators);

    app.route('/api/v3/vocabs/local/creators/id')
        .get(Local.getLocalCreatorsById);

    app.route('/api/v3/vocabs/local/subjects')
        .get(Local.getLocalSubjects);

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

    app.route('/api/v3/vocabs/local/creators/save')
        .post(Local.saveLocalCreators);

    app.route('/api/v3/vocabs/local/instructors/save')
        .post(Local.saveLocalInstructors);
};