'use strict';

module.exports = {

    prepareCreate(_, recordTmpl) {

        // consolidate line items by product
        const itemsByProduct = {};
        for (let item of recordTmpl.items) {
            if (itemsByProduct[item.productRef]) {
                itemsByProduct[item.productRef].quantity += item.quantity;
            } else {
                itemsByProduct[item.productRef] = item;
            }
        }
        recordTmpl.items = Object.values(itemsByProduct);
    },

    beforeCreate(txCtx, recordTmpl) {

        // check if all products exist and are available
        return txCtx.rejectIfNotExactNum(
            'Product', [
                [ 'id => oneof', recordTmpl.items.map(
                    item => txCtx.refToId('Product', item.productRef)) ],
                [ 'available => is', true ]
            ], recordTmpl.items.length,
            400, 'Some products do not exist or are unavailable.'

        // then check that account exists
        ).then(() => txCtx.rejectIfNotExists(
            'Account', [
                [ 'id => is', txCtx.refToId('Account', recordTmpl.accountRef) ]
            ],
            400, 'Account does not exist.'
        ));
    }
};
