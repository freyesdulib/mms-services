const config = require('../config/config'),
    vdb = require('knex')({
        client: 'mysql',
        connection: {
            host: config.dbHost,
            user: config.dbUser,
            password: config.dbPassword,
            database: config.dbNameVocab
        },
        pool: {
            min: 2,
            max: 10
        }
    });

module.exports = function () {
    return vdb;
};