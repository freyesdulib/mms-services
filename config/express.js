'use strict';

var http = require('http'),
    express = require('express'),
    compress = require('compression'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    helmet = require('helmet'),
    cors = require('cors');
    // config = require('../config/config');

module.exports = function () {

    var app = express(),
        server = http.createServer(app);

    if (process.env.NODE_ENV === 'development') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    } else if (process.env.NODE_ENV === 'production') {
        app.use(compress());
    }

    app.use(cors());
    app.options('*', cors());
    /*
    app.use(function(req, res, next) {
        res.setHeader("Access-Control-Allow-Origin", config.requestOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET', 'POST', 'PUT', 'DELETE');
        res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    });
    */

    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use(bodyParser.json());
    app.use(methodOverride());
    app.use(helmet());

    require('../service-ulan/routes')(app);
    require('../service-aat/routes')(app);
    require('../service-lc/routes')(app);
    require('../service-local/routes')(app);
    require('../service-indexer/routes')(app);
    require('../service-mms/routes')(app);
    require('../service-auth/routes')(app);
    require('../search/routes')(app);
    require('../service-metadata/routes')(app);

    return server;
};