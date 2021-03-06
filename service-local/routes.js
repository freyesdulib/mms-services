'use strict';

var Local = require('../service-local/controller');

module.exports = function (app) {

    app.route('/v3/vocabs')
        .get(Local.getServiceInfo);

    app.route('/v3/vocabs/local/creators')
        .get(Local.getLocalCreators);

    app.route('/v3/vocabs/local/creators/id')
        .get(Local.getLocalCreatorsById);

    app.route('/v3/vocabs/local/subjects')
        .get(Local.getLocalSubjects);

    app.route('/v3/vocabs/local/art_types')
        .get(Local.getArtTypes);

    app.route('/v3/vocabs/local/time_periods')
        .get(Local.getTimePeriods);

    app.route('/v3/vocabs/local/instructors')
        .get(Local.getInstructors);

    app.route('/v3/vocabs/local/sources')
        .get(Local.getLocalSources);

    app.route('/v3/vocabs/local/sources/save')
        .post(Local.saveLocalSources);

    app.route('/v3/vocabs/local/creators/save')
        .post(Local.saveLocalCreators);

    app.route('/v3/vocabs/local/instructors/save')
        .post(Local.saveLocalInstructors);
};