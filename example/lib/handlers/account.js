'use strict';

const crypto = require('crypto');

// used to save the original email value on the transaction context
const ORIGINAL_EMAIL = Symbol();

function digestPassword(password) {

    return crypto
        .createHash('sha1')
        .update(password, 'utf8')
        .digest('hex');
}

module.exports = {

    prepareUpdateSpec(txCtx, patchSpec) {

        // calculate password digest if plain password is updated
        switch (txCtx.call.entityContentType) {
        case 'application/merge-patch+json':
            if (typeof patchSpec.password === 'string') {
                patchSpec.passwordDigest = digestPassword(patchSpec.password);
                delete patchSpec.password;
            }
            break;
        case 'application/json-patch+json':
            txCtx.patchSpec = txCtx.patchSpec.map(op => (
                op.op === 'replace' && op.path === '/password' &&
                    typeof op.value === 'string'
                    ? {
                        op: 'replace',
                        path: '/passwordDigest',
                        value: digestPassword(op.value)
                    }
                    : op
            ));
        }
    },

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
