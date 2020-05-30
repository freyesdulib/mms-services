var config = require('../config/config'),
    db = require('knex')({
        client: 'mysql2',
        connection: {
            host     : config.dbHost,
            user     : config.dbUser,
            password : config.dbPassword,
            database : config.dbNameVocab
        },
        pool: {
            min: 2,
            max: 10
        }
    });

module.exports = function () {
    return db;
};