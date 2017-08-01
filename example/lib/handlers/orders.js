'use strict';

module.exports = {

    prepareCreate(txCtx) {

        // consolidate line items by product
        const itemsByProduct = {};
        for (let item of txCtx.recordTmpl.items) {
            if (itemsByProduct[item.productRef]) {
                itemsByProduct[item.productRef].quantity += item.quantity;
            } else {
                itemsByProduct[item.productRef] = item;
            }
        }
        txCtx.recordTmpl.items = Object.values(itemsByProduct);
    },

    beforeCreate(txCtx) {

        const recordTmpl = txCtx.recordTmpl;

        // check if all products exist and are available
        return txCtx.rejectIfNotExactNum('Product', [
            [ 'id => oneof', recordTmpl.items.map(
                item => txCtx.refToId('Product', item.productRef)) ],
            [ 'available => is', true ]
        ], recordTmpl.items.length,
        400, 'Some products do not exist or are unavailable.')

        // check that account exists
        .then(
            () => txCtx.rejectIfNotExists('Account', [
                [ 'id => is', txCtx.refToId('Account', recordTmpl.accountRef) ]
            ]),
            err => Promise.reject(err)
        );
    }
};
