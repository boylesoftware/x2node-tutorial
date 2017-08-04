'use strict';

const crypto = require('crypto');

module.exports = {

    prepareCreateSpec(_, recordTmpl) {

        // calculate password digest if plain password was attached
        if (typeof recordTmpl.password === 'string') {
            recordTmpl.passwordDigest = crypto
                .createHash('sha1')
                .update(recordTmpl.password, 'utf8')
                .digest('hex');
            delete recordTmpl.password;
        }
    },

    beforeCreate(txCtx, recordTmpl) {

        // check no other account with same email exists
        return txCtx.rejectIfExists(
            'Account', [
                [ 'email => eq', recordTmpl.email ]
            ],
            400, 'Another account with that E-mail exists.'
        );
    }
};
