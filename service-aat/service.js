const config = require('../config/config.js'),
    request = require('request'),
    cheerio = require('cheerio'),
    xmldoc = require('xmldoc'),
    validator = require('validator'),
    host = config.gettyApiAatHost;

// var host = 'http://vocab.getty.edu/';
// var host = 'http://getty.ontotext.com/';  // test server

exports.getAatSubjects = function(req, callback) {

    if (req.query.term === undefined) {

        callback({
            status: 400,
            data: []
        });

        return false;
    }

    var term = validator.trim(req.query.term);
    var options = {};
    var query = 'sparql.json?query=SELECT+%3FSubject+%3FTerm+%3FParents+%3FScopeNote+%3FType+%7B%0D%0A++%3FSubject+luc%3Aterm+%22' + term + '*%22%3B+a+%3Ftyp.%0D%0A++%3Ftyp+rdfs%3AsubClassOf+gvp%3ASubject%3B+rdfs%3Alabel+%3FType.%0D%0A++optional+%7B%3FSubject+gvp%3AprefLabelGVP+%5Bskosxl%3AliteralForm+%3FTerm%5D%7D%0D%0A++optional+%7B%3FSubject+gvp%3AparentStringAbbrev+%3FParents%7D%0D%0A++optional+%7B%3FSubject+skos%3AscopeNote+%5Bdct%3Alanguage+gvp_lang%3Aen%3B+skosxl%3AliteralForm+%3FScopeNote%5D%7D%7D&_implicit=false&implicit=true&_equivalent=false&_form=%2Fsparql';
    options.uri = host + query;
    options.timeout = 100000;
    options.headers = {'Accept': 'application/sparql-results+json;charset=ISO-8859-1'};

    request.get(options, function(err, response, json) {

        if (!err && response.statusCode === 200) {

            if (validator.isJSON(json)) {

                callback({
                    status: 200,
                    data: json
                });

                return false;

            } else {

                callback({
                    status: 400,
                    data: []
                });

                return false;
            }

        } else if (response.statusCode === 500) {

            callback({
                status: 500,
                data: []
            });

            return false;
        }
    });
};
