'use strict';

module.exports = {

    beforeDelete(txCtx) {

        // get product id from the call URI
        const productId = Number(txCtx.call.uriParams[0]);

        // check if orders exist for the product
        return txCtx.rejectIfExists(
            'Order', [
                [ 'items => !empty', [
                    [ 'productRef => is', productId ]
                ]]
            ],
            400, 'Orders exist for the product.'
        );
    }
};
