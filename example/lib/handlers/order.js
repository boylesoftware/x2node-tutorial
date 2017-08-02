'use strict';

const ws = require('x2node-ws');

// used to save original order product references on the transaction context
const ORIGINAL_PRODUCTS = Symbol();

module.exports = {

    beforeUpdate(txCtx, record) {

        // save original product references
        txCtx[ORIGINAL_PRODUCTS] = new Set(record.items.map(item => item.productRef));
    },

    beforeUpdateSave(txCtx, record) {

        // verify that there are no product duplicates
        const productRefs = new Set();
        for (let item of record.items) {
            if (productRefs.has(item.productRef))
                return Promise.reject(ws.createResponse(422).setEntity({
                    errorMessage: 'Multiple line items for the same product.'
                }));
            productRefs.add(item.productRef);
        }

        // make sure all added products exist
        const existingProductRefs = txCtx[ORIGINAL_PRODUCTS];
        const addedProductRefs = record.items
            .map(item => item.productRef)
            .filter(productRef => !existingProductRefs.has(productRef));
        if (addedProductRefs.length > 0)
            return txCtx.rejectIfNotExactNum(
                'Product', [
                    [ 'id => oneof', addedProductRefs.map(
                        productRef => txCtx.refToId('Product', productRef)) ],
                    [ 'available => is', true ]
                ], addedProductRefs.length,
                422, 'Some added products do not exist or are unavailable.'
            );
    }
};
