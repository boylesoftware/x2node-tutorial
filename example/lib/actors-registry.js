'use strict';

const dbos = require('x2node-dbos');

class MyActorsRegistry {

    constructor(pool, dboFactory) {

        // save the database connections pool reference
        this.pool = pool;

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

        // lookup account record by email
        return new Promise((resolve, reject) => {

            // get database connection
            this.pool.getConnection((err, con) => {

                // check if failed getting database connection
                if (err)
                    return reject(err);

                // execute account lookup DBO on the connection
                this.accountFetch.execute(con, null, {
                    email: handle

                }).then(

                    // process DBO result
                    result => {

                        // release database connection
                        con.release();

                        // check if matching account found
                        if (result.records.length > 0) {

                            // build and return actor object
                            const account = result.records[0];
                            resolve({
                                id: account.id,
                                stamp: account.email,
                                hasRole: () => false
                            });

                        } else { // no matching account

                            // no actor
                            resolve(null);
                        }
                    },

                    // DBO execution error
                    err => {

                        // release database connection
                        con.release();

                        // reject actor lookup with error
                        reject(err);
                    }
                );
            });
        });
    }
}

// export the registry class
module.exports = MyActorsRegistry;
