'use strict';

exports.validatorDefs = {
    'notSaturday': function(_, ctx, value) {

        // don't check if the value is missing or an invalid date
        if (!ctx.hasErrorsFor(ctx.currentPointer)) {

            // add validation error if the date is a Saturday
            if ((new Date(value)).getUTCDay() === 6)
                ctx.addError('Live the world alone once a week!');
        }

        // proceed with the value unchanged
        return value;
    }
};

function withRecordProps(props) {

    props['id'] = {
        valueType: 'number',
        role: 'id'
    };
    props['version'] = {
        valueType: 'number',
        role: 'version'
    }
    props['createdOn'] = {
        valueType: 'datetime',
        role: 'creationTimestamp',
        column: 'created_on'
    }
    props['createdBy'] = {
        valueType: 'string',
        role: 'creationActor',
        column: 'created_by'
    }
    props['modifiedOn'] = {
        valueType: 'datetime',
        role: 'modificationTimestamp',
        optional: true,
        column: 'modified_on'
    }
    props['modifiedBy'] = {
        valueType: 'string',
        role: 'modificationActor',
        optional: true,
        column: 'modified_by'
    }

    return props;
}

exports.recordTypes = {
    'Product': {
        table: 'products',
        properties: withRecordProps({
            'name': {
                valueType: 'string',
                validators: [ ['maxLength', 50] ]
            },
            'description': {
                valueType: 'string',
                optional: true
            },
            'price': {
                valueType: 'number',
                validators: [ ['precision', 2], ['range', 0.00, 999.99] ]
            },
            'available': {
                valueType: 'boolean',
                column: 'is_available'
            }
        })
    },
    'Account': {
        table: 'accounts',
        properties: withRecordProps({
            'email': {
                valueType: 'string',
                validators: [ ['maxLength', 60], 'email', 'lowercase' ]
            },
            'firstName': {
                valueType: 'string',
                column: 'fname',
                validators: [ ['maxLength', 30] ]
            },
            'lastName': {
                valueType: 'string',
                column: 'lname',
                validators: [ ['maxLength', 30] ]
            },
            'passwordDigest': {
                valueType: 'string',
                column: 'pwd_digest',
                validators: [ ['pattern', /^[0-9a-f]{40}$/] ]
            }
        })
    },
    'Order': {
        table: 'orders',
        properties: withRecordProps({
            'accountRef': {
                valueType: 'ref(Account)',
                column: 'account_id',
                modifiable: false
            },
            'placedOn': {
                valueType: 'string',
                column: 'placed_on',
                validators: [ 'date', 'notSaturday' ],
                modifiable: false
            },
            'status': {
                valueType: 'string',
                validators: {
                    'onCreate': [ ['oneOf', 'NEW'] ],
                    'onUpdate': [ ['oneOf', 'NEW', 'SHIPPED', 'CANCELED'] ]
                }
            },
            'paymentTransactionId': {
                valueType: 'string',
                column: 'payment_txid',
                optional: true,
                validators: {
                    'onCreate': [ 'empty' ],
                    'onUpdate': [ 'required' ],
                    '*': [ ['maxLength', 100] ]
                },
                modifiable: false
            },
            'items': {
                valueType: 'object[]',
                optional: false,
                table: 'order_items',
                parentIdColumn: 'order_id',
                modifiable: false,
                properties: {
                    'id': {
                        valueType: 'number',
                        role: 'id'
                    },
                    'productRef': {
                        valueType: 'ref(Product)',
                        column: 'product_id'
                    },
                    'quantity': {
                        valueType: 'number',
                        column: 'qty',
                        validators: [ 'integer', ['range', 1, 255] ]
                    }
                }
            }
        })
    }
};
