# Creating RESTful Web-Service Backed by a SQL Database Using X2 Framework for Node.js

This is a tutorial that shows how to develop a simple server-side application that provides a RESTful API to access data stored in a SQL database using _X2 Framework for Node.js_ (or simply _x2node_).

## Introduction

_X2 Framework for Node.js_, or _x2node_ (we call it "times two node", but we won't get offended if you say "eks to node"), is a framework comprised of several related but standalone modules that may be helpful with solving a wide range of _Node.js_ server-side application development tasks. However, originally the framework's main purpose was and remains to provide everything you need to develop a web-service that exposes a RESTful API and is backed with a SQL database. This is the type of application, with which _x2node_ is the most helpful.

In this tutorial we are going to develop a simplified web-service for an online store that provides a catalog of products and allows registred shoppers to place orders. We are going to be focusing only on the server-side but we will assume that there is a front-end web-application that provides the UI for the online store and is the main client of the web-service API. This tutorial is a good way to get an introduction of the most essential features and modules of the framework, but it does not replace documentation of the individual framework modules, which provides the most in-depth information including all the advanced features that may be left out here.

## Preparation

Before we begin the development, let's specify our web-service.

### Record Types

First, let's identify with what data objects our application is going to be working. These data objects are going to be stored in our database and the web-service API will be providing access to them. In the _x2node_ world, these objects are called _records_ and their shape is defined by their corresponding _record types_.

Our application is going to be working with the following major record types:

* _Product_ - This is a descriptor of a product available in our online store. Every product will have a name, a description, a price and an availability flag.
* _Account_ - This is an account of a registered customer. It will include the person's name, E-mail address, information used to authenticate (login) the customer.
* _Order_ - This is an order placed by a customer for a number of products. The record will include information about when the order was placed, what customer placed the order, the order status ("new", "accepted", "shipped"), order charge transaction ID and the order line items, each of which will include the ordered product and the ordered quantity.

### Actors

Now, let's identify types of users that are going to be calling our API. In the _x2node_ world, entities that call the API are called _actors_.

Our application will be serving two types of actors:

* _Customer_ - The online store customers. A customer can manage his or her own account and place orders.
* _Admin_ - The store administrator, who will have access to the complete API and will be able to perform all operations such as manage the product catalog, customer accounts and orders.

We will also have unauthenticated calls. For example, searching the product catalog will not require a logged in user and will be available to the public.

### API Endpoints

There is a certain approach to the API endpoints design that _x2node_ suggests. Instead of identifying very specific API use-cases dictated by the API client (e.g. the UI web-application) and creating narrowly specific endpoints for each of those use-cases, we create general purpose API endpoints for the basic CRUD operations for each record type our web-service is going to expose. After that, we can customize those endpoints by either limiting or extending their functionality and create any additional endpoint for the specific use-cases not covered by the generic endpoints. This approach allows us to have a completely functional back-end API developed before the client application(s) are settled. Having that in mind, let's see what endpoints our API is going to have.

First, let's define the most essential API for our actors. This API will provide full access to the online store data and allow searching, reading, creating, updating and deleting records of every supported record type given the actor role sufficient for the operation. Here it goes:

| URI                     | Method   | Required Role       | Description
| ----------------------- | -------- | ------------------- | -----------
| _/products_             | `GET`    | _Everybody_         | This call will allow searching the products catalog. The search parameters, together with result sorting, product data included in the response and any result pagination requirements will be included in the API request as URL parameters. The call is allowed to everybody, including unauthenticated users.
| _/products_             | `POST`   | _Admin_             | This will be used by the store admins to create new products. The product data will be included in the call HTTP request body.
| _/products/{productId}_ | `GET`    | _Everybody_         | This call will allow getting information about the specific product identified by the product ID in the call URI. All available product information will be included in the HTTP response body. The call is allowed to everybody, including unauthenticated users.
| _/products/{productId}_ | `PATCH`  | _Admin_             | This call will be used by the store admins to update product information. The specific product is identified by the ID in the call URI. The product data patch specification will be included in the call HTTP request body.
| _/products/{productId}_ | `DELETE` | _Admin_             | This will allow store admins to completely erase the product from the catalog. The product is identified by the ID in the call URI. Deletion of a product will not be allowed if orders exist for it (product availability flag can be used to hide the product from the catalog in that case).
| _/accounts_             | `GET`    | _Admin_             | Will allow store admins to search the customer accounts. As with the _/products_ endpoint, the search parameters will be specified in the request URL parameters. Only admins will be allowed to list/search customer accounts.
| _/accounts_             | `POST`   | _Everybody_         | This call will be used to create new customer accounts. For the purpose of this tutorial, this is a very simple call allowed to everybody, so everybody can registered. A real-life online store would probably have a more complex logic including account confirmation.
| _/accounts/{accountId}_ | `GET`    | _Admin_, _Customer_ | Get customer account information. The customer is identified by the account ID in the URI. Admins can request information about any existing customer. A customer can request information only about him or herself (the ID in the URI must match the authenticated user ID).
| _/accounts/{accountId}_ | `PATCH`  | _Admin_, _Customer_ | Update customer account information. Admins can update any account, customers can update only their own accounts.
| _/accounts/{accountId}_ | `DELETE` | _Admin_, _Customer_ | Permanently delete customer account. Admins can delete any account, customers can delete only their own accounts. Accounts are allowed to be deleted only if they don't have any orders.
| _/orders_               | `GET`    | _Admin_             | List/search orders.
| _/orders_               | `POST`   | _Admin_             | Create an order.
| _/orders/{orderId}_     | `GET`    | _Admin_             | Get order information.
| _/orders/{orderId}_     | `PATCH`  | _Admin_             | Updated order.
| _/orders/{orderId}_     | `DELETE` | _Admin_             | Delete order.

As you can see, there is the same set of endpoints for each record type in our system: we have an enpoint that addresses all records of the given type and allows `GET` and `POST` HTTP methods, and we have an endpoint that addresses a specific record of the given type identified by the record ID included in the URI and allows `GET`, `PATCH` and `DELETE` methods. The first endpoint type is called _record collection endpoint_ and the second type is called _individual record endpoint_. That way, our web-service API represents the records of different record types as _resources_ in the true RESTful API spirit.

You may notice that the _Order_ resource API is open only to the store admins. But how do customers manage their own orders? We could allow role _Customer_ access the _Order_ resource endpoints, but then we would have to implement some tricky logic in the back-end that would limit their access only to their own orders (we don't want them to see or do anything to other customers' orders). Instead, we can introduce endpoints for sub-resources under the _/accounts/{accountId}_ URI like this:

| URI                                      | Method   | Description
| ---------------------------------------- | -------- | -----------
| _/accounts/{accountId}/orders_           | `GET`    | List/search orders of the specific customer.
| _/accounts/{accountId}/orders_           | `POST`   | Create new order for the customer.
| _/accounts/{accountId}/orders/{orderId}_ | `GET`    | Get one of the customer's orders.
| _/accounts/{accountId}/orders/{orderId}_ | `PATCH`  | Update one of the customer's orders.
| _/accounts/{accountId}/orders/{orderId}_ | `DELETE` | Delete one of the customer's orders (only of the order status is "new").

The _/orders_ endpoints will be used by the store administrative application and present the _Order_ as a system-wide resource. The _/accounts/{accountId}/orders_ endpoints will be used by the end-user application and present the _Order_ as a sub-resource of the _Account_ resource.

We will also need a special, non-resource endpoint to allow our users to login:

| URI      | Method | Description
| -------- | ------ | -----------
| _/login_ | `POST` | Authenticate a user, which may be the store admin or a customer. The username and the password will be provided as the request parameters. The response will include an authentication token that can be used with subsequent API calls.

Not every web-service handles initial user authentication (the user login) itself. These days standards like _OAuth2.0_ allow delegation of the authentication token issuing to a thrid-party. The web-service then merely verifies the authentication tokens it receives with the calls and matches them against its own user database. For the purpose of our tutorial, however, we are going to the our web-service handle user logins on its own.

## The Database

There is a long standing tradition in developing database-driven server-side applications to start with the database design. Let's honor this tradition and define our schema. For this tutorial we'll use _MySQL_ (the framework's SQL database access module also supports _PostgreSQL_ and will support other databases in the near future).

Given our record types, the schema is straightforward:

```sql
CREATE TABLE products (
    id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price NUMERIC(5,2) NOT NULL,
    is_available BOOLEAN NOT NULL
);

CREATE TABLE accounts (
    id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(60) NOT NULL UNIQUE, -- used as login name
    fname VARCHAR(30) NOT NULL,
    lname VARCHAR(30) NOT NULL,
    pwd_digest CHAR(40) NOT NULL -- password SHA digest in hex encoding
);

CREATE TABLE orders (
    id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_id INTEGER UNSIGNED NOT NULL,
    placed_on CHAR(10) NOT NULL, -- in YYYY-MM-DD format
    status ENUM('NEW', 'ACCEPTED', 'SHIPPED') NOT NULL,
    payment_txid VARCHAR(100), -- payments backend transaction id when ACCEPTED
    FOREIGN KEY (account_id) REFERENCES accounts (id)
);

CREATE TABLE order_items (
    id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- we'll need it later
    order_id INTEGER UNSIGNED NOT NULL,
    product_id INTEGER UNSIGNED NOT NULL,
    qty TINYINT UNSIGNED NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (product_id) REFERENCES products (id),
    UNIQUE (order_id, product_id)
);
```

You may notice that we added a synthetic primary key to the order items table, which is technically not needed for a fully normalized schema. We will need it later, however, as the framework will be relying on it to correctly process changes to the order items.

At the moment, the framework does not have a module that generates database schema for you automatically. We may develop such module in some future, but in any case, we recommend maintaining the database schema as a separate piece of your project. Yes, it introduces a task of maintaining your data sotrage definition in sync in two separate places&mdash;the database and your application&mdash;but it also gives you full control over the data storage intricacies (think indexes, tablespaces, collations, etc.). Your DBAs will thank you!

So, go ahead, fire up your _MariaDB_, create a database, create a database user for your application and initialize the schema with the above DDL. Something like this:

```
$ mysql -uroot -p
...

MariaDB [(none)]> create database x2tutotial character set 'utf8';
Query OK, 1 row affected (0.00 sec)

MariaDB [(none)]> grant all on x2tutorial.* to 'x2tutorial'@'localhost' identified by 'x2tutorial';
Query OK, 0 rows affected (0.00 sec)

MariaDB [(none)]> exit
Bye

$ mysql -ux2tutorial -px2tutorial x2tutorial < create-schema-mysql.sql
```

## Project Setup

_x2node_ modules are published in NPM, so let's setup our project using it. Let's create a directory called `x2tutorial` for our project and in it create our intial `package.json` file:

```json
{
  "name": "x2tutorial",
  "private": true
}
```

We can also save our database schema creation script along with the project under, say, `misc/schema/create-schema-mysql.sql`. So that we have:

```
x2tutorial/
+--misc/
|  +--schema/
|     +--create-schema-mysql.sql
+--package.json
```

### Record Type Definitions

We started our project with the database schema definition. Now, let's define our record types for the application and map them to the tables and columns in the database.

For our application our records are going to be represented by JSON objects and that's what our exposed API will be operating with as well. Each record type will need a _record type definition_ that describes the shape of the record object, maps object properties to the database, establishes record relations, adds property value validation rules, etc. All of the application record type definitions together are assembled into the _record types library_, which is an object provided by the _x2node_ framework to the rest of the application and represents the application's data domain description. Other framework modules as well as the application's custom code use the record types library object to query the record types meta-data.

Let's create a separate file under `lib/record-type-defs.js` where we are going to keep our record type definitions so that have all data structure related stuff in a single place:

```javascript
'use strict';

exports.recordTypes = {
    'Product': {
        table: 'products',
        properties: {
            'id': {
                valueType: 'number',
                role: 'id'
            },
            'name': {
                valueType: 'string',
                validators: [ [ 'maxLength', 50 ] ]
            },
            'description': {
                valueType: 'string',
                optional: true
            },
            'price': {
                valueType: 'number',
                validators: [ [ 'range', 0.00, 999.99 ] ]
            },
            'available': {
                valueType: 'boolean',
                column: 'is_available'
            }
        }
    },
    'Account': {
        table: 'accounts',
        properties: {
            'id': {
                valueType: 'number',
                role: 'id'
            },
            'email': {
                valueType: 'string',
                validators: [ [ 'maxLength', 60 ], 'email', 'lowercase' ]
            },
            'firstName': {
                valueType: 'string',
                column: 'fname',
                validators: [ [ 'maxLength', 30 ] ]
            },
            'lastName': {
                valueType: 'string',
                column: 'lname',
                validators: [ [ 'maxLength', 30 ] ]
            },
            'passwordDigest': {
                valueType: 'string',
                column: 'pwd_digest',
                validators: [ [ 'pattern', /[0-9a-f]{40}/ ] ]
            }
        }
    },
    'Order': {
        table: 'orders',
        properties: {
            'id': {
                valueType: 'number',
                role: 'id'
            },
            'accountRef': {
                valueType: 'ref(Account)',
                column: 'account_id',
                modifiable: false
            },
            'placedOn': {
                valueType: 'string',
                column: 'placed_on',
                validators: [ 'date' ],
                modifiable: false
            },
            'status': {
                valueType: 'string',
                validators: [ [ 'oneOf', 'NEW', 'ACCEPTED', 'SHIPPED' ] ]
            },
            'paymentTransactionId': {
                valueType: 'string',
                column: 'payment_txid',
                optional: true,
                validators: [ [ 'maxLength', 100 ] ]
            },
            'items': {
                valueType: 'object[]',
                table: 'order_items',
                parentIdColumn: 'order_id',
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
                        validators: [ 'integer', [ 'range', 1, 255 ] ]
                    }
                }
            }
        }
    }
};
```

The above definitions should be in large part self-explanatory. The framework module that will be working with these definitions&mdash;the module that provides the record types library&mdash;is [x2node-records](https://github.com/boylesoftware/x2node-records). See its manual for the record type definitions basics. We also utilize some extended definition attributes such as `validators` attribute provided by the [x2node-validators](https://github.com/boylesoftware/x2node-validators) module, and `table` and `column` attributes provided by the [x2node-dbos](https://github.com/boylesoftware/x2node-dbos) module.

If you don't feel like reading the full documentation for those modules right at this moment, which is totally understandable, a few explanatory notes about the above:
