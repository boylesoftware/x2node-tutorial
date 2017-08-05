'use strict';

const ws = require('x2node-ws');
const dbos = require('x2node-dbos');
const jws = require('jws');
const crypto = require('crypto');

class LoginHandler {

    constructor(pool, dboFactory) {

        this.pool = pool;

        // save the database connections pool reference
        this.pool = pool;

        // build and save account fetch DBO
        this.accountFetch = dboFactory.buildFetch('Account', {
            props: [ 'id', 'email', 'firstName', 'lastName' ],
            filter: [
                [ 'email => is', dbos.param('email') ],
                [ 'passwordDigest => is', dbos.param('passwordDigest') ]
            ]
        });

        // save secret key for token signatures
        this.secret = new Buffer(process.env.SECRET, 'base64');

        // save admin password
        this.adminPassword = process.env.ADMIN_PASSWORD;
    }

    POST(call) {

        // get and validate login information
        const loginInfo = call.entity;
        if (!loginInfo || typeof loginInfo.username !== 'string' ||
            typeof loginInfo.password !== 'string')
            return ws.createResponse(400).setEntity({
                errorMessage: 'Missing or invalid login information.'
            });

        // check if admin login
        if (loginInfo.username === 'admin') {

            // check if password matches
            if (loginInfo.password !== this.adminPassword)
                return ws.createResponse(400).setEntity({
                    errorMessage: 'Invalid login.'
                });

            // admin login successful
            return this.loginSuccessResponse({
                id: 0,
                email: 'admin'
            });
        }

        // customer login:

        // lookup account record by email and password digest
        return new Promise((resolve, reject) => {

            // get database connection
            this.pool.getConnection((err, con) => {

                // check if failed getting database connection
                if (err)
                    return reject(err);

                // execute account lookup DBO on the connection
                this.accountFetch.execute(con, null, {
                    email: loginInfo.username,
                    passwordDigest: crypto
                        .createHash('sha1')
                        .update(loginInfo.password, 'utf8')
                        .digest('hex')

                }).then(

                    // process DBO result
                    result => {

                        // release database connection
                        con.release();

                        // check if matching account found
                        if (result.records.length > 0) {

                            // customer login successful
                            resolve(this.loginSuccessResponse(result.records[0]));

                        } else { // no matching account

                            // invalid login
                            reject(ws.createResponse(400).setEntity({
                                errorMessage: 'Invalid login.'
                            }));
                        }
                    },

                    // DBO execution error
                    err => {

                        // release database connection
                        con.release();

                        // reject call with error
                        reject(err);
                    }
                );
            });
        });
    }

    loginSuccessResponse(account) {

        // build and sign the JWT
        const now = Date.now() / 1000;
        const idToken = jws.sign({
            header: {
                alg: 'HS256'
            },
            payload:{
                iss: 'x2tutorial',
                aud: 'client',
                sub: account.email,
                iat: now,
                exp: now + 3600 // expire after an hour
            },
            secret: this.secret
        });

        // return successful login response
        return ws.createResponse(200).setEntity({
            sub: account.email,
            firstName: account.firstName,
            lastName: account.lastName,
            id_token: idToken
        });
    }
}

module.exports = LoginHandler;
