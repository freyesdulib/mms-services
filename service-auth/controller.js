/**

 Copyright 2019 University of Denver

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 */

'use strict';

const VALIDATOR = require('validator'),
    SERVICE = require('../service-auth/service');

exports.login = function (req, res) {

    if (req.body !== undefined) {

        let username = VALIDATOR.trim(req.body.username),
            password = VALIDATOR.trim(req.body.password);

        if (username.length === 0) {

            res.status(401).send({
                message: 'Authenticate failed. Please enter your DU ID.'
            });

            return false;

        } else if (password.length === 0) {

            res.status(401).send({
                message: 'Authenticate failed. Please enter your passcode.'
            });

            return false;

        } else if (VALIDATOR.isNumeric(username) === false) {

            res.status(401).send({
                message: 'Authenticate failed due to invalid username.  Please enter a DU ID. i.e. 871******'
            });

            return false;

        } else {

            SERVICE.authenticate(username, password, function (isAuth) {

                if (isAuth.auth === true) {

                    res.status(200).send({
                        message: 'Authenticated.'
                    });

                } else if (isAuth.auth === false) {

                    res.status(401).send({
                        message: 'Authenticate failed.'
                    });
                }
            });
        }
    }
};