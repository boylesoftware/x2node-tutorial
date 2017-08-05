'use strict';

const dbos = require('x2node-dbos');

class MyActorsRegistry {

    constructor(ds, dboFactory) {

        // save the database connections pool reference
        this.ds = ds;

        // build and save account fetch DBO
        this.accountFetch = dboFactory.buildFetch('Account', {
            props: [ 'id', 'email' ],
            filter: [
                [ 'email => is', dbos.param('email') ]
            ]
        });
    }

    lookupActor(handle) {

        // admin is a special case
        if (handle === 'admin')
            return {
                id: 0,
                stamp: 'admin',
                hasRole: () => true
            };

        // get database connection and lookup account record by email
        let dbConnection;
        return this.ds.getConnection(

        // execute account lookup DBO
        ).then(con => this.accountFetch.execute(dbConnection = con, null, {
            email: handle

        // get matched account, if any, from the lookup result
        })).then(result => (
            result.records.length > 0 ? result.records[0] : null

        // build and return actor object if account found
        )).then(account => (
            account ?
                {
                    id: account.id,
                    stamp: account.email,
                    hasRole: () => false
                }
                : null

        // release the database connection
        )).then(

            // success
            actor => (this.ds.releaseConnection(dbConnection), actor),

            // error
            err => (
                dbConnection ?
                    (this.ds.releaseConnection(dbConnection), Promise.reject(err))
                    : Promise.reject(err)
            )
        );
    }
}

// export the registry class
module.exports = MyActorsRegistry;
