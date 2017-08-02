'use strict';

// used to save the original email value on the transaction context
const ORIGINAL_EMAIL = Symbol();

module.exports = {

    beforeUpdate(txCtx, record) {

        // remember original email on the transaction context
        txCtx[ORIGINAL_EMAIL] = record.email;
    },

    beforeUpdateSave(txCtx, record) {

        // if email changed, make sure no duplicate exists
        if (record.email !== txCtx[ORIGINAL_EMAIL])
            return txCtx.rejectIfExists(
                'Account', [
                    [ 'email => eq', record.email ],
                    [ 'id => not', record.id ]
                ],
                422, 'Another account with that E-mail exists.'
            );
    },

    beforeDelete(txCtx) {

        // get account id from the call URI
        const accountId = Number(txCtx.call.uriParams[0]);

        // check if orders exist for the account
        return txCtx.rejectIfExists(
            'Order', [
                [ 'accountRef => is', accountId ]
            ],
            400, 'Orders exist for the account.'
        );
    }
};
