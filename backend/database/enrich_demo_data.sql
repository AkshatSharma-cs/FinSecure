-- ============================================================
-- FinSecure demo data enrichment
-- Adds account products, transaction history, cards, and loans
-- for existing customers. Safe to run more than once.
-- ============================================================

USE finsecure_db;

-- Extra account products for existing customers.
INSERT INTO accounts (account_number, customer_id, account_type, balance, minimum_balance, currency,
    status, ifsc_code, branch_name, created_at, updated_at)
SELECT
    CONCAT('FINS9', LPAD(c.id, 9, '0')) AS account_number,
    c.id,
    CASE
        WHEN c.id % 5 = 0 THEN 'FIXED_DEPOSIT'
        WHEN c.id % 3 = 0 THEN 'RECURRING_DEPOSIT'
        ELSE 'SAVINGS'
    END,
    ROUND(15000 + (c.id * 1375.45) % 350000, 2),
    CASE WHEN c.id % 5 = 0 THEN 0.00 ELSE 500.00 END,
    'INR',
    'ACTIVE',
    'FINS0001234',
    CASE
        WHEN c.city IS NOT NULL AND c.city <> '' THEN CONCAT(c.city, ' Branch')
        ELSE 'Main Branch'
    END,
    DATE_SUB(NOW(6), INTERVAL (c.id % 24) MONTH),
    NOW(6)
FROM customers c
WHERE c.id BETWEEN 1 AND 205
  AND NOT EXISTS (
      SELECT 1 FROM accounts a WHERE a.account_number = CONCAT('FINS9', LPAD(c.id, 9, '0'))
  );

-- Debit cards for active accounts.
INSERT INTO cards (account_id, card_type, scheme, variant, masked_card_number, card_number_hash,
    card_holder_name, expiry_date, cvv_hash, status, credit_limit, available_limit, prepaid_balance,
    international_enabled, online_enabled, contactless_enabled, annual_fee, perks, created_at, updated_at)
SELECT
    a.id,
    'DEBIT',
    'STANDARD',
    CASE WHEN a.id % 4 = 0 THEN 'VIRTUAL' ELSE 'REGULAR' END,
    CONCAT('**** **** **** ', LPAD((a.id * 73) % 10000, 4, '0')),
    SHA2(CONCAT('DEBIT-', a.id, '-', a.account_number), 256),
    CONCAT(c.first_name, ' ', c.last_name),
    DATE_ADD(CURDATE(), INTERVAL 5 YEAR),
    SHA2(CONCAT('CVV-', a.id), 256),
    'ACTIVE',
    NULL,
    0.00,
    0.00,
    a.id % 3 = 0,
    TRUE,
    a.id % 4 <> 0,
    0,
    'ATM withdrawals, UPI, online and contactless payments',
    DATE_SUB(NOW(6), INTERVAL (a.id % 18) MONTH),
    NOW(6)
FROM accounts a
JOIN customers c ON c.id = a.customer_id
WHERE a.status = 'ACTIVE'
  AND NOT EXISTS (
      SELECT 1 FROM cards card
      WHERE card.account_id = a.id
        AND card.card_type = 'DEBIT'
        AND card.variant = CASE WHEN a.id % 4 = 0 THEN 'VIRTUAL' ELSE 'REGULAR' END
  );

-- Credit cards for approved-KYC customers.
INSERT INTO cards (account_id, card_type, scheme, variant, masked_card_number, card_number_hash,
    card_holder_name, expiry_date, cvv_hash, status, credit_limit, available_limit, prepaid_balance,
    international_enabled, online_enabled, contactless_enabled, annual_fee, perks, created_at, updated_at)
SELECT
    primary_account.id,
    'CREDIT',
    CASE
        WHEN c.id % 4 = 0 THEN 'SIGNATURE'
        WHEN c.id % 3 = 0 THEN 'PLATINUM'
        WHEN c.id % 2 = 0 THEN 'GOLD'
        ELSE 'CLASSIC'
    END,
    CASE WHEN c.id % 6 = 0 THEN 'VIRTUAL' ELSE 'REGULAR' END,
    CONCAT('**** **** **** ', LPAD((c.id * 97) % 10000, 4, '0')),
    SHA2(CONCAT('CREDIT-', c.id, '-', primary_account.account_number), 256),
    CONCAT(c.first_name, ' ', c.last_name),
    DATE_ADD(CURDATE(), INTERVAL 5 YEAR),
    SHA2(CONCAT('CC-CVV-', c.id), 256),
    'ACTIVE',
    CASE
        WHEN c.id % 4 = 0 THEN 1000000.00
        WHEN c.id % 3 = 0 THEN 300000.00
        WHEN c.id % 2 = 0 THEN 100000.00
        ELSE 50000.00
    END,
    CASE
        WHEN c.id % 4 = 0 THEN 850000.00
        WHEN c.id % 3 = 0 THEN 240000.00
        WHEN c.id % 2 = 0 THEN 82000.00
        ELSE 42000.00
    END,
    0.00,
    c.id % 2 = 0,
    TRUE,
    c.id % 6 <> 0,
    CASE
        WHEN c.id % 4 = 0 THEN 2500
        WHEN c.id % 3 = 0 THEN 1000
        WHEN c.id % 2 = 0 THEN 500
        ELSE 0
    END,
    CASE
        WHEN c.id % 4 = 0 THEN '5x rewards, lounge access, concierge and travel insurance'
        WHEN c.id % 3 = 0 THEN '3x rewards, airport lounge access and fuel surcharge waiver'
        WHEN c.id % 2 = 0 THEN '2x dining rewards and cashback on fuel'
        ELSE '1% cashback on all spends'
    END,
    DATE_SUB(NOW(6), INTERVAL (c.id % 12) MONTH),
    NOW(6)
FROM customers c
JOIN (
    SELECT customer_id, MIN(id) AS account_id
    FROM accounts
    WHERE status = 'ACTIVE'
    GROUP BY customer_id
) first_account ON first_account.customer_id = c.id
JOIN accounts primary_account ON primary_account.id = first_account.account_id
WHERE c.kyc_status = 'APPROVED'
  AND NOT EXISTS (
      SELECT 1 FROM cards card
      WHERE card.account_id = primary_account.id
        AND card.card_type = 'CREDIT'
  );

-- Prepaid cards for a smaller product mix.
INSERT INTO cards (account_id, card_type, scheme, variant, masked_card_number, card_number_hash,
    card_holder_name, expiry_date, cvv_hash, status, credit_limit, available_limit, prepaid_balance,
    international_enabled, online_enabled, contactless_enabled, annual_fee, perks, created_at, updated_at)
SELECT
    a.id,
    'PREPAID',
    'PREPAID',
    CASE WHEN a.id % 2 = 0 THEN 'VIRTUAL' ELSE 'REGULAR' END,
    CONCAT('**** **** **** ', LPAD((a.id * 131) % 10000, 4, '0')),
    SHA2(CONCAT('PREPAID-', a.id, '-', a.account_number), 256),
    CONCAT(c.first_name, ' ', c.last_name),
    DATE_ADD(CURDATE(), INTERVAL 3 YEAR),
    SHA2(CONCAT('PP-CVV-', a.id), 256),
    'ACTIVE',
    NULL,
    0.00,
    ROUND(1000 + (a.id * 245.75) % 25000, 2),
    FALSE,
    TRUE,
    a.id % 2 <> 0,
    0,
    'Reloadable prepaid card for controlled spends',
    DATE_SUB(NOW(6), INTERVAL (a.id % 10) MONTH),
    NOW(6)
FROM accounts a
JOIN customers c ON c.id = a.customer_id
WHERE a.status = 'ACTIVE'
  AND a.id % 3 = 0
  AND NOT EXISTS (
      SELECT 1 FROM cards card
      WHERE card.account_id = a.id
        AND card.card_type = 'PREPAID'
  );

-- Monthly salary/income credits and routine debits across active accounts.
INSERT INTO transactions (reference_number, account_id, type, mode, amount, balance_after,
    description, target_account_number, status, created_at)
SELECT
    CONCAT('DEMOCR', LPAD(a.id, 5, '0'), LPAD(m.n, 2, '0')),
    a.id,
    'CREDIT',
    CASE WHEN a.account_type = 'CURRENT' THEN 'NEFT' ELSE 'IMPS' END,
    ROUND(22000 + ((a.id + m.n) * 823.37) % 125000, 2),
    ROUND(a.balance + (m.n * 2400) + ((a.id * 19) % 5000), 2),
    CASE WHEN a.account_type = 'CURRENT' THEN 'Business receipts' ELSE 'Monthly income credit' END,
    NULL,
    'SUCCESS',
    DATE_SUB(DATE_SUB(NOW(6), INTERVAL m.n MONTH), INTERVAL (a.id % 24) HOUR)
FROM accounts a
CROSS JOIN (
    SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
    SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL
    SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
) m
WHERE a.status = 'ACTIVE'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.reference_number = CONCAT('DEMOCR', LPAD(a.id, 5, '0'), LPAD(m.n, 2, '0'))
  );

INSERT INTO transactions (reference_number, account_id, type, mode, amount, balance_after,
    description, target_account_number, status, created_at)
SELECT
    CONCAT('DEMODB', LPAD(a.id, 5, '0'), LPAD(m.n, 2, '0')),
    a.id,
    'DEBIT',
    CASE m.n % 5
        WHEN 0 THEN 'UPI'
        WHEN 1 THEN 'ONLINE'
        WHEN 2 THEN 'ATM'
        WHEN 3 THEN 'NEFT'
        ELSE 'CASH'
    END,
    ROUND(LEAST(450 + ((a.id + m.n) * 173.29) % 18000, GREATEST(100.00, a.balance * 0.35)), 2),
    ROUND(GREATEST(a.minimum_balance, a.balance - (m.n * 1700) - ((a.id * 23) % 7000)), 2),
    CASE m.n % 6
        WHEN 0 THEN 'Grocery and household purchase'
        WHEN 1 THEN 'Utility bill payment'
        WHEN 2 THEN 'ATM cash withdrawal'
        WHEN 3 THEN 'Rent or maintenance payment'
        WHEN 4 THEN 'Online shopping'
        ELSE 'Dining and travel expense'
    END,
    NULL,
    'SUCCESS',
    DATE_SUB(DATE_SUB(NOW(6), INTERVAL m.n MONTH), INTERVAL ((a.id % 24) + 72) HOUR)
FROM accounts a
CROSS JOIN (
    SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
    SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL
    SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
) m
WHERE a.status = 'ACTIVE'
  AND NOT EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.reference_number = CONCAT('DEMODB', LPAD(a.id, 5, '0'), LPAD(m.n, 2, '0'))
  );

-- Varied loans for existing customers.
INSERT INTO loans (loan_number, customer_id, reviewed_by, loan_type, principal_amount, interest_rate,
    tenure_months, emi_amount, outstanding_amount, total_interest, status, disbursement_date,
    next_emi_date, purpose, rejection_reason, closed_date, created_at, updated_at)
SELECT
    CONCAT('DEMO-LN-A-', LPAD(c.id, 5, '0')),
    c.id,
    (SELECT MIN(id) FROM employees),
    CASE c.id % 6
        WHEN 0 THEN 'HOME'
        WHEN 1 THEN 'PERSONAL'
        WHEN 2 THEN 'CAR'
        WHEN 3 THEN 'EDUCATION'
        WHEN 4 THEN 'BUSINESS'
        ELSE 'GOLD'
    END,
    CASE c.id % 6
        WHEN 0 THEN 3500000.00
        WHEN 1 THEN 450000.00
        WHEN 2 THEN 850000.00
        WHEN 3 THEN 1200000.00
        WHEN 4 THEN 1800000.00
        ELSE 250000.00
    END,
    CASE c.id % 6
        WHEN 0 THEN 8.50
        WHEN 1 THEN 12.50
        WHEN 2 THEN 9.50
        WHEN 3 THEN 7.50
        WHEN 4 THEN 11.00
        ELSE 10.00
    END,
    CASE c.id % 6
        WHEN 0 THEN 240
        WHEN 1 THEN 48
        WHEN 2 THEN 60
        WHEN 3 THEN 84
        WHEN 4 THEN 72
        ELSE 24
    END,
    ROUND((CASE c.id % 6
        WHEN 0 THEN 3500000.00
        WHEN 1 THEN 450000.00
        WHEN 2 THEN 850000.00
        WHEN 3 THEN 1200000.00
        WHEN 4 THEN 1800000.00
        ELSE 250000.00
    END) / (CASE c.id % 6
        WHEN 0 THEN 240
        WHEN 1 THEN 48
        WHEN 2 THEN 60
        WHEN 3 THEN 84
        WHEN 4 THEN 72
        ELSE 24
    END) * 1.18, 2),
    ROUND((CASE c.id % 6
        WHEN 0 THEN 3500000.00
        WHEN 1 THEN 450000.00
        WHEN 2 THEN 850000.00
        WHEN 3 THEN 1200000.00
        WHEN 4 THEN 1800000.00
        ELSE 250000.00
    END) * 0.72, 2),
    ROUND((CASE c.id % 6
        WHEN 0 THEN 3500000.00
        WHEN 1 THEN 450000.00
        WHEN 2 THEN 850000.00
        WHEN 3 THEN 1200000.00
        WHEN 4 THEN 1800000.00
        ELSE 250000.00
    END) * 0.28, 2),
    CASE WHEN c.kyc_status = 'APPROVED' THEN 'ACTIVE' ELSE 'UNDER_REVIEW' END,
    CASE WHEN c.kyc_status = 'APPROVED' THEN DATE_SUB(CURDATE(), INTERVAL (c.id % 18) MONTH) ELSE NULL END,
    CASE WHEN c.kyc_status = 'APPROVED' THEN DATE_ADD(CURDATE(), INTERVAL 1 MONTH) ELSE NULL END,
    CASE c.id % 6
        WHEN 0 THEN 'Home purchase'
        WHEN 1 THEN 'Personal expenses'
        WHEN 2 THEN 'Vehicle purchase'
        WHEN 3 THEN 'Higher education'
        WHEN 4 THEN 'Business expansion'
        ELSE 'Gold-backed short-term finance'
    END,
    NULL,
    NULL,
    DATE_SUB(NOW(6), INTERVAL (c.id % 18) MONTH),
    NOW(6)
FROM customers c
WHERE c.id BETWEEN 1 AND 205
  AND c.kyc_status IN ('APPROVED', 'SUBMITTED')
  AND NOT EXISTS (
      SELECT 1 FROM loans l WHERE l.loan_number = CONCAT('DEMO-LN-A-', LPAD(c.id, 5, '0'))
  );

INSERT INTO loans (loan_number, customer_id, reviewed_by, loan_type, principal_amount, interest_rate,
    tenure_months, emi_amount, outstanding_amount, total_interest, status, disbursement_date,
    next_emi_date, purpose, rejection_reason, closed_date, created_at, updated_at)
SELECT
    CONCAT('DEMO-LN-B-', LPAD(c.id, 5, '0')),
    c.id,
    (SELECT MIN(id) FROM employees),
    CASE WHEN c.id % 2 = 0 THEN 'PERSONAL' ELSE 'CAR' END,
    CASE WHEN c.id % 2 = 0 THEN 175000.00 ELSE 650000.00 END,
    CASE WHEN c.id % 2 = 0 THEN 12.50 ELSE 9.50 END,
    CASE WHEN c.id % 2 = 0 THEN 24 ELSE 48 END,
    CASE WHEN c.id % 2 = 0 THEN 8240.00 ELSE 16310.00 END,
    CASE
        WHEN c.id % 5 = 0 THEN 0.00
        WHEN c.id % 4 = 0 THEN 175000.00
        ELSE 98000.00
    END,
    CASE WHEN c.id % 2 = 0 THEN 22760.00 ELSE 133880.00 END,
    CASE
        WHEN c.id % 5 = 0 THEN 'CLOSED'
        WHEN c.id % 4 = 0 THEN 'APPLIED'
        ELSE 'ACTIVE'
    END,
    CASE WHEN c.id % 4 = 0 THEN NULL ELSE DATE_SUB(CURDATE(), INTERVAL (6 + c.id % 10) MONTH) END,
    CASE WHEN c.id % 5 = 0 OR c.id % 4 = 0 THEN NULL ELSE DATE_ADD(CURDATE(), INTERVAL 1 MONTH) END,
    CASE WHEN c.id % 2 = 0 THEN 'Short-term personal loan' ELSE 'Vehicle upgrade' END,
    NULL,
    CASE WHEN c.id % 5 = 0 THEN DATE_SUB(CURDATE(), INTERVAL (c.id % 6) MONTH) ELSE NULL END,
    DATE_SUB(NOW(6), INTERVAL (6 + c.id % 10) MONTH),
    NOW(6)
FROM customers c
WHERE c.id BETWEEN 1 AND 205
  AND c.kyc_status = 'APPROVED'
  AND NOT EXISTS (
      SELECT 1 FROM loans l WHERE l.loan_number = CONCAT('DEMO-LN-B-', LPAD(c.id, 5, '0'))
  );

SELECT 'accounts' AS table_name, COUNT(*) AS total_rows FROM accounts
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'cards', COUNT(*) FROM cards
UNION ALL SELECT 'loans', COUNT(*) FROM loans;
