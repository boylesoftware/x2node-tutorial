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

* _Product_ - This is a descriptor of a product available in our online store. Every product will have a name, a description, an image, a price and an availability flag.
* _Account_ - This is an account of a registered customer. It will include the person's name, E-mail address, payment method information, information used to authenticate (login) the customer.
* _Order_ - This is an order placed by a customer for a number of products. The record will include information about when the order was placed, what customer placed the order, the order status ("new", "processing", "shipped"), order charge transaction ID and the order line items, each of which will include the ordered product and the ordered quantity.

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
| _/accounts/{accountId}_ | `PATCH`  | _Admin, _Customer_  | Update customer account information. Admins can update any account, customers can update only their own accounts.
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
