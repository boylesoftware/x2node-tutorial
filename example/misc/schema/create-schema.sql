CREATE TABLE products (
    id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    version INTEGER UNSIGNED NOT NULL,
    created_on TIMESTAMP(3) DEFAULT 0,
    created_by VARCHAR(60),
    modified_on TIMESTAMP(3) NULL,
    modified_by VARCHAR(60),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price NUMERIC(5,2) NOT NULL,
    is_available BOOLEAN NOT NULL
);

CREATE TABLE accounts (
    id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    version INTEGER UNSIGNED NOT NULL,
    created_on TIMESTAMP(3) DEFAULT 0,
    created_by VARCHAR(60),
    modified_on TIMESTAMP(3) NULL,
    modified_by VARCHAR(60),
    email VARCHAR(60) NOT NULL UNIQUE,
    fname VARCHAR(30) NOT NULL,
    lname VARCHAR(30) NOT NULL,
    pwd_digest CHAR(40) NOT NULL
);

CREATE TABLE orders (
    id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    version INTEGER UNSIGNED NOT NULL,
    created_on TIMESTAMP(3) DEFAULT 0,
    created_by VARCHAR(60),
    modified_on TIMESTAMP(3) NULL,
    modified_by VARCHAR(60),
    account_id INTEGER UNSIGNED NOT NULL,
    placed_on CHAR(10) NOT NULL,
    status ENUM('NEW', 'SHIPPED', 'CANCELED') NOT NULL,
    payment_txid VARCHAR(100) NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts (id)
);

CREATE TABLE order_items (
    id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INTEGER UNSIGNED NOT NULL,
    product_id INTEGER UNSIGNED NOT NULL,
    qty TINYINT UNSIGNED NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (product_id) REFERENCES products (id),
    UNIQUE (order_id, product_id)
);
