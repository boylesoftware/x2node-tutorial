'use strict';

const ws = require('x2node-ws');

const paymentsService = require('../payments-service.js');

// used to save original order status on the transaction context
const ORIGINAL_STATUS = Symbol();

module.exports = {

    configure() {

        // get rid of the DELETE method implementation
        this.DELETE = false;
    },

    beforeUpdate(txCtx, record) {

        // save original order status
        txCtx[ORIGINAL_STATUS] = record.status;
    },

    beforeUpdateSave(txCtx, record) {

        // check if status changed and perform corresponding actions
        const originalStatus = txCtx[ORIGINAL_STATUS];
        if (record.status !== originalStatus) {

            // only NEW order can be updated
            if (originalStatus !== 'NEW')
                return Promise.reject(ws.createResponse(409).setEntity({
                    errorMessage: 'Invalid order status transition.'
                }));

            // execute payment backend action
            switch (record.status) {
            case 'SHIPPED':

                // only and admin can make the order SHIPPED
                if (!txCtx.call.actor.hasRole('admin'))
                    return Promise.reject(ws.createResponse(403).setEntity({
                        errorMessage: 'Insufficient permissions.'
                    }));

                // capture the payment transaction
                return paymentsService.capturePayment(record.paymentTransactionId);

            case 'CANCELED':

                // void the payment transaction
                return paymentsService.voidPayment(record.paymentTransactionId);
            }
        }
    }
};
