'use strict';

// load runtime environment configuration
require('dotenv').load();

// create database connections pool
const pool = require('mysql').createPool({
    connectionLimit: 5,
    host: process.env['DB_HOST'],
    port: process.env['DB_PORT'] || 3306,
    database: process.env['DB_NAME'],
    user: process.env['DB_USER'],
    password: process.env['DB_PASSWORD']
});

// load framework modules
const records = require('x2node-records');
const dbos = require('x2node-dbos');
const ws = require('x2node-ws');
const resources = require('x2node-ws-resources');

// build record types library (don't forget the DBOs extension)
const recordTypes = records.with(dbos).buildLibrary(
    require('./lib/record-type-defs.js'));

// create DBO factory for our record types library, MySQL flavor
const dboFactory = dbos.createDBOFactory(recordTypes, 'mysql');

// wrap the database connections pool with a generic interface for the framework
const ds = dboFactory.adaptDataSource(pool);

// create resource endpoint handlers factory and pass our DBO factory to it
const handlers = resources.createResourceHandlersFactory(ds, dboFactory);

process.on('unhandledRejection', error => {
  console.log('### unhandledRejection', error);
});

// assemble and run the web-service
ws.createApplication()

    // graceful shutdown, close the database connections pool
    .on('shutdown', () => {
        pool.end();
    })

    // add API endpoints
    .addEndpoint(
        '/products',
        handlers.collectionResource(
            'Product', require('./lib/handlers/products.js')))
    .addEndpoint(
        '/products/([1-9][0-9]*)',
        handlers.individualResource(
            'Product', require('./lib/handlers/product.js')))
    .addEndpoint(
        '/accounts',
        handlers.collectionResource(
            'Account', require('./lib/handlers/accounts.js')))
    .addEndpoint(
        '/accounts/([1-9][0-9]*)',
        handlers.individualResource(
            'Account', require('./lib/handlers/account.js')))
    .addEndpoint(
        '/orders',
        handlers.collectionResource(
            'Order', require('./lib/handlers/orders.js')))
    .addEndpoint(
        '/orders/([1-9][0-9]*)',
        handlers.individualResource(
            'Order', require('./lib/handlers/order.js')))
    .addEndpoint(
        '/accounts/([1-9][0-9]*)/orders',
        handlers.collectionResource(
            'accountRef<-Order', require('./lib/handlers/orders.js')))
    .addEndpoint(
        '/accounts/([1-9][0-9]*)/orders/([1-9][0-9]*)',
        handlers.individualResource(
            'accountRef<-Order', require('./lib/handlers/order.js')))

    // run the service
    .run(Number(process.env['HTTP_PORT']));
