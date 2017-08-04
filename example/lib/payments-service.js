'use strict';

const crypto = require('crypto');
const common = require('x2node-common');

const log = common.getDebugLogger('PAYMENTS');

exports.authorizePayment = function(ccNumber, ccExpDate, amount) {

    return new Promise((resolve, reject) => {

        // check expiration date
        const ccExpDateDt = new Date(ccExpDate);
        const nowDt = new Date();
        if (ccExpDateDt.getUTCFullYear() * 12 + ccExpDateDt.getUTCMonth() <
            nowDt.getUTCFullYear() * 12 + nowDt.getUTCMonth())
            return reject(new Error('Credit card has expired.'));

        // all good, generate payment transaction id
        crypto.randomBytes(20, (err, buf) => {
            if (err)
                return reject(err);
			const txId = buf.toString('hex');
            log(`payment ${txId} authorized for $${amount}`);
            resolve(txId);
        });
    });
};

exports.capturePayment = function(txId) {

    return new Promise(resolve => {
        setTimeout(() => { log(`payment ${txId} captured`); resolve(); }, 200);
    });
};

exports.voidPayment = function(txId) {

    return new Promise(resolve => {
        setTimeout(() => { log(`payment ${txId} voided`); resolve(); }, 200);
    });
};
