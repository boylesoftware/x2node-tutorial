'use strict';

const crypto = require('crypto');

exports.authorizePayment = function(ccNumber, ccExpDate) {

    return new Promise((resolve, reject) => {
        crypto.randomBytes(20, (err, buf) => {
            if (err)
                return reject(err);
            return resolve(buf.toString('hex'));
        });
    });
};

exports.capturePayment = function(txId) {

    return new Promise(resolve => {
        setTimeout(() => resolve(), 200);
    });
};

exports.voidPayment = function(txId) {

    return new Promise(resolve => {
        setTimeout(() => resolve(), 200);
    });
};
