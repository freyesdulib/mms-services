'use strict';

var Aat = require('../aat-service/controller');

module.exports = function (app) {

    app.route('/api/v3/vocabs/aat/subjects')
        .get(Aat.getAatSubjects);
};