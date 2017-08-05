'use strict';

const ws = require('x2node-ws');
const dbos = require('x2node-dbos');
const jws = require('jws');
const crypto = require('crypto');

class LoginHandler {

    constructor(ds, dboFactory) {

        // save the database connections pool reference
        this.ds = ds;

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

        // get database connection and lookup account record by email and password digest
        let dbConnection;
        return this.ds.getConnection(

        // execute account lookup DBO on the connection
        ).then(con => this.accountFetch.execute(dbConnection = con, null, {
            email: loginInfo.username,
            passwordDigest: crypto
                .createHash('sha1')
                .update(loginInfo.password, 'utf8')
                .digest('hex')

        // get matched account, if any, from the lookup result
        })).then(result => (
            result.records.length > 0 ? result.records[0] : null

        // build either login success or failure response
        )).then(account => (
            account ?
                this.loginSuccessResponse(account)
                : Promise.reject(ws.createResponse(400).setEntity({
                    errorMessage: 'Invalid login.'
                }))

        // release the database connection
        )).then(

            // success
            response => (this.ds.releaseConnection(dbConnection), response),

            // error
            err => (
                dbConnection ?
                    (this.ds.releaseConnection(dbConnection), Promise.reject(err))
                    : Promise.reject(err)
            )
        );
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

// export the handler class
module.exports = LoginHandler;
