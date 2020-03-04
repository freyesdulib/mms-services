'use strict';

module.exports = {
    host: process.env.HOST,
    dbHost: process.env.DB_HOST,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbNameVocab: process.env.DB_NAME_VOCAB,
    dbNameStats: process.env.DB_NAME_STATS,
    elasticSearch: process.env.ELASTIC_SEARCH,
    mmsServices: process.env.MMS_SERVICES,
    gettyApiUlanHost: process.env.GETTY_API_ULAN_HOST,
    gettyApiAatHost: process.env.GETTY_API_AAT_HOST,
    gettyApiUsername: process.env.GETTY_API_USERNAME,
    gettApiPassword: process.env.GETTY_API_PASSWORD,
    requestOrigin: process.env.REQUEST_ORIGIN,
    fedora: process.env.FEDORA,
    solr: process.env.SOLR,
    ldap: process.env.LDAP
};