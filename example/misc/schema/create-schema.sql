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
    placed_on CHAR(10) NOT NULL,
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
