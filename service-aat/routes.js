'use strict';

var Aat = require('../service-aat/controller');

module.exports = function (app) {

    app.route('/v3/vocabs/aat/subjects')
        .get(Aat.getAatSubjects);
};