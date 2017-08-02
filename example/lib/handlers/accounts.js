'use strict';

module.exports = {

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
