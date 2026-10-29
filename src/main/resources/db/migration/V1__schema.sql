-- MOS schema: the 14 tables of SA 2.0 section 3.5 (Data Dictionary).
--
-- Conventions
--   * Every TIMESTAMP column holds UTC (hibernate.jdbc.time_zone=UTC).
--     Opening hours (TIME) are store-local; the store's zone is app config.
--   * Enum-like VARCHAR columns are lower-case snake_case and guarded by CHECKs.
--   * Columns marked "not in SA" are needed by the customer app or the
--     dashboard and are listed in README "Open questions".

CREATE TABLE users (
    user_id        BIGSERIAL    PRIMARY KEY,
    first_name     VARCHAR(50)  NOT NULL,
    last_name      VARCHAR(50)  NOT NULL,
    email          VARCHAR(255) UNIQUE,
    phone          VARCHAR(20)  UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(10)  NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
    status         VARCHAR(10)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    date_of_birth  DATE,
    created_at     TIMESTAMP    NOT NULL,
    updated_at     TIMESTAMP,
    -- FR-02: a customer signs up with a phone number or an email.
    CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE saved_cards (
    card_id        BIGSERIAL    PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users (user_id),
    gateway_token  VARCHAR(255) NOT NULL,
    card_brand     VARCHAR(20)  NOT NULL,
    masked_number  VARCHAR(25)  NOT NULL,
    expiry_month   SMALLINT     NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year    SMALLINT     NOT NULL,
    holder_name    VARCHAR(100),                      -- not in SA (card picture in Figma)
    created_at     TIMESTAMP    NOT NULL
);

CREATE TABLE categories (
    category_id  BIGSERIAL   PRIMARY KEY,
    name         VARCHAR(50) NOT NULL UNIQUE,
    sort_order   INT         NOT NULL DEFAULT 0,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
    product_id    BIGSERIAL     PRIMARY KEY,
    category_id   BIGINT        NOT NULL REFERENCES categories (category_id),
    name          VARCHAR(100)  NOT NULL,
    description   TEXT,
    image_url     VARCHAR(255)  NOT NULL DEFAULT '',
    base_price    NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    is_available  BOOLEAN       NOT NULL DEFAULT TRUE,  -- false = sold out
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,  -- false = removed from menu
    created_at    TIMESTAMP     NOT NULL
);

CREATE TABLE option_groups (
    group_id          BIGSERIAL   PRIMARY KEY,
    name              VARCHAR(50) NOT NULL,
    selection_type    VARCHAR(10) NOT NULL CHECK (selection_type IN ('single', 'multiple')),
    is_required       BOOLEAN     NOT NULL,
    max_select        SMALLINT    NOT NULL CHECK (max_select >= 1),
    sort_order        INT         NOT NULL DEFAULT 0,   -- not in SA (display order)
    needs_iced_drink  BOOLEAN     NOT NULL DEFAULT FALSE, -- not in SA (ice level hidden for hot)
    summary_noun      VARCHAR(20),                       -- not in SA ("Less" -> "Less ice")
    CONSTRAINT option_groups_single_max CHECK (selection_type = 'multiple' OR max_select = 1)
);

CREATE TABLE options (
    option_id    BIGSERIAL     PRIMARY KEY,
    group_id     BIGINT        NOT NULL REFERENCES option_groups (group_id),
    name         VARCHAR(50)   NOT NULL,
    extra_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
    sort_order   INT           NOT NULL DEFAULT 0,
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    is_iced      BOOLEAN       NOT NULL DEFAULT FALSE   -- not in SA ("Iced" temperature)
);

CREATE TABLE product_option_groups (
    pog_id             BIGSERIAL PRIMARY KEY,
    product_id         BIGINT    NOT NULL REFERENCES products (product_id),
    group_id           BIGINT    NOT NULL REFERENCES option_groups (group_id),
    default_option_id  BIGINT    REFERENCES options (option_id),
    is_active          BOOLEAN   NOT NULL DEFAULT TRUE,
    CONSTRAINT product_option_groups_unique UNIQUE (product_id, group_id)
);

-- Which options a drink offers, with an optional drink-specific price
-- (extra_price NULL = use options.extra_price). See README "Open questions".
CREATE TABLE product_options (
    product_option_id  BIGSERIAL     PRIMARY KEY,
    product_id         BIGINT        NOT NULL REFERENCES products (product_id),
    option_id          BIGINT        NOT NULL REFERENCES options (option_id),
    extra_price        NUMERIC(10,2),
    CONSTRAINT product_options_unique UNIQUE (product_id, option_id)
);

CREATE TABLE orders (
    order_id       BIGSERIAL     PRIMARY KEY,
    pickup_code    VARCHAR(10)   UNIQUE,
    customer_id    BIGINT        REFERENCES users (user_id),  -- empty for walk-in
    handled_by     BIGINT        REFERENCES users (user_id),
    source         VARCHAR(25)   NOT NULL CHECK (source IN ('online', 'walk_in')),
    status         VARCHAR(20)   NOT NULL CHECK (status IN (
                       'pending_payment', 'placed', 'confirmed', 'preparing', 'ready',
                       'completed', 'cancelled', 'rejected', 'abandoned')),
    pickup_type    VARCHAR(10)   NOT NULL CHECK (pickup_type IN ('asap', 'scheduled')),
    pickup_time    TIMESTAMP,
    note           TEXT,
    total_amount   NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    reject_reason  VARCHAR(255),
    placed_at      TIMESTAMP,
    confirmed_at   TIMESTAMP,
    preparing_at   TIMESTAMP,
    ready_at       TIMESTAMP,
    completed_at   TIMESTAMP,
    ended_at       TIMESTAMP,
    created_at     TIMESTAMP     NOT NULL,
    updated_at     TIMESTAMP     NOT NULL,
    CONSTRAINT orders_reject_reason CHECK (status <> 'rejected' OR reject_reason IS NOT NULL),
    CONSTRAINT orders_scheduled_time CHECK (pickup_type <> 'scheduled' OR pickup_time IS NOT NULL)
);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_created_at_idx ON orders (created_at);
CREATE INDEX orders_customer_idx ON orders (customer_id);

CREATE TABLE order_items (
    order_item_id  BIGSERIAL     PRIMARY KEY,
    order_id       BIGINT        NOT NULL REFERENCES orders (order_id),
    product_id     BIGINT        NOT NULL REFERENCES products (product_id),
    product_name   VARCHAR(100)  NOT NULL,
    unit_price     NUMERIC(10,2) NOT NULL,
    quantity       SMALLINT      NOT NULL CHECK (quantity >= 1),
    line_total     NUMERIC(10,2) NOT NULL
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE order_item_options (
    item_option_id  BIGSERIAL     PRIMARY KEY,
    order_item_id   BIGINT        NOT NULL REFERENCES order_items (order_item_id),
    option_id       BIGINT        NOT NULL REFERENCES options (option_id),
    option_name     VARCHAR(50)   NOT NULL,
    extra_price     NUMERIC(10,2) NOT NULL
);
CREATE INDEX order_item_options_item_idx ON order_item_options (order_item_id);

CREATE TABLE payments (
    payment_id       BIGSERIAL     PRIMARY KEY,
    order_id         BIGINT        NOT NULL REFERENCES orders (order_id),
    method           VARCHAR(10)   NOT NULL CHECK (method IN ('khqr', 'card', 'cash')),
    amount           NUMERIC(10,2) NOT NULL,
    status           VARCHAR(20)   NOT NULL CHECK (status IN (
                         'pending', 'paid', 'failed', 'refund_pending', 'refunded')),
    transaction_ref  VARCHAR(100),
    recorded_by      BIGINT        REFERENCES users (user_id),
    paid_at          TIMESTAMP,
    created_at       TIMESTAMP     NOT NULL,
    failure_reason   VARCHAR(255)                        -- not in SA (failure screen)
);
CREATE INDEX payments_order_idx ON payments (order_id);

CREATE TABLE store_settings (
    setting_id            SMALLINT     PRIMARY KEY CHECK (setting_id = 1),  -- one row
    store_name            VARCHAR(100) NOT NULL,
    address               VARCHAR(255) NOT NULL,
    phone                 VARCHAR(20)  NOT NULL,
    slot_interval_min     SMALLINT     NOT NULL DEFAULT 15 CHECK (slot_interval_min > 0),
    min_prep_min          SMALLINT     NOT NULL DEFAULT 30 CHECK (min_prep_min >= 0),
    pickup_timeout_min    SMALLINT     NOT NULL DEFAULT 30 CHECK (pickup_timeout_min > 0),
    online_ordering_open  BOOLEAN      NOT NULL DEFAULT TRUE,
    asap_prep_min         SMALLINT     NOT NULL DEFAULT 10 CHECK (asap_prep_min >= 0)  -- not in SA
);

CREATE TABLE opening_hours (
    day_of_week  SMALLINT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday
    open_time    TIME,
    close_time   TIME,
    is_closed    BOOLEAN  NOT NULL DEFAULT FALSE,
    CONSTRAINT opening_hours_times CHECK (
        is_closed OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time))
);

-- The store always has its settings row and seven days of hours.
INSERT INTO store_settings (setting_id, store_name, address, phone)
VALUES (1, 'MOS Coffee', 'Phnom Penh', '012 345 678');

INSERT INTO opening_hours (day_of_week, open_time, close_time, is_closed)
SELECT d, TIME '07:00', TIME '21:00', FALSE FROM generate_series(0, 6) AS d;
