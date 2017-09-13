'use strict';

// load the framework modules
const records = require('x2node-records');
const validators = require('x2node-validators');
const ws = require('x2node-ws');

// load the payments backend service module
const paymentsService = require('../payments-service.js');

// define additional fields in the new order template
const orderTemplateDef = records.with(validators).buildLibrary({
    recordTypes: {
        'OrderTemplate': {
            properties: {

                // id field definition is required
                'id': {
                    valueType: 'number',
                    role: 'id',
                    validators: [ '-required' ] // don't require
                },

                // payment information
                'creditCardNumber': {
                    valueType: 'string',
                    validators: [ 'ccNumber' ]
                },
                'creditCardExpDate': {
                    valueType: 'string',
                    validators: [ ['pattern', /20\d{2}-(0[1-9]|1[0-2])/] ]
                }
            }
        }
    }
});

module.exports = {

    prepareCreate(txCtx, recordTmpl) {

        // make sure we have payment information in the record template
        const errors = validators.normalizeRecord(
            orderTemplateDef, 'OrderTemplate', recordTmpl);
        if (errors)
            return Promise.reject(ws.createResponse(400).setEntity({
                errorMessage: 'Invalid new order data.',
                validationErrors: errors
            }));

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

        // check that account exists
        return txCtx.rejectIfNotExists(
            'Account', [
                [ 'id => is', txCtx.refToId('Account', recordTmpl.accountRef) ]
            ],
            400, 'Account does not exist.'

        // then fetch ordered product prices to calculate the order amount
        ).then(() => txCtx.fetch(
            'Product', {
                props: [ 'price' ],
                filter: [
                    [ 'id => in', recordTmpl.items.map(
                        item => txCtx.refToId('Product', item.productRef)) ],
                    [ 'available => is', true ]
                ],
                lock: 'shared'
            }

        // then process the fetched products
        )).then(productsResult => {

            // make sure all products exist and are available
            if (productsResult.records.length !== recordTmpl.items.length)
                return Promise.reject(ws.createResponse(400).setEntity({
                    errorMessage: 'Some products do not exist or are unavailable.'
                }));

            // calculate the order total
            const productPrices = productsResult.records.reduce(
                (productPrices, product) => {
                    productPrices[`Product#${product.id}`] = product.price;
                    return productPrices;
                }, new Object());
            return recordTmpl.items.reduce(
                (orderAmount, item) => (
                    orderAmount + productPrices[item.productRef] * item.quantity
                ), 0);

        // then authorize the payment and get the payment transaction id
        }).then(orderAmount => paymentsService.authorizePayment(
            recordTmpl.creditCardNumber, recordTmpl.creditCardExpDate, orderAmount

            // catch payment error
            ).catch(paymentError => Promise.reject(
                ws.createResponse(400).setEntity({
                    errorMessage: `Could not process payment: ${paymentError.message}`
                })
            )

        // then set the payment transaction id on the order record
        )).then(paymentTransactionId => {
            recordTmpl.paymentTransactionId = paymentTransactionId;
        });
    }
};
