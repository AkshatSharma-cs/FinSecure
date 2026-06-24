export const DEMO_MODE = true;
export const DEMO_TOKEN = 'demo-jwt-token-for-finsecure-recruiter-demo';

const clone = (value) => JSON.parse(JSON.stringify(value));

const createInitialDemoState = () => ({
  user: {
    id: 101,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@gmail.com',
    username: 'john.doe',
    phone: '9876543210',
    panNumber: 'ABCJD5678K',
    dateOfBirth: '1988-05-15',
    address: 'A-12, Meadow Heights',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400001',
    kycStatus: 'APPROVED',
  },
  accounts: [
    {
      id: 1,
      accountNumber: 'FINS2001112233',
      accountType: 'SAVINGS',
      balance: 184500,
      ifscCode: 'FINS0001234',
      branchName: 'BKC Branch',
      status: 'ACTIVE',
    },
    {
      id: 2,
      accountNumber: 'FINS2001445566',
      accountType: 'CURRENT',
      balance: 452000,
      ifscCode: 'FINS0001234',
      branchName: 'BKC Branch',
      status: 'ACTIVE',
    },
    {
      id: 3,
      accountNumber: 'FINS2001778899',
      accountType: 'FIXED_DEPOSIT',
      balance: 1000000,
      ifscCode: 'FINS0001234',
      branchName: 'BKC Branch',
      status: 'ACTIVE',
    },
  ],
  transactions: (() => {
    const transactions = [];
    const accounts = [
      { id: 1, accountNumber: 'FINS2001112233' },
      { id: 2, accountNumber: 'FINS2001445566' },
      { id: 3, accountNumber: 'FINS2001778899' },
    ];
    const descriptions = [
      'Salary credit from FinSecure Payroll',
      'UPI payment to Zomato',
      'NEFT transfer to Priya Sharma',
      'Electricity bill payment',
      'ATM withdrawal at Andheri branch',
      'EMI debit for Home Loan',
      'Online shopping at Myntra',
      'FD interest credited',
      'Cash deposit at branch counter',
      'NEFT transfer to Rahul Mehta',
      'Mobile recharge',
      'UPI cashback reward',
      'Fuel expense at HPCL',
      'Client payment received',
      'FD premature closure',
      'Grocery purchase at Spencer',
      'Water bill payment',
      'Rent transfer to landlord',
      'Grocerystore payment',
      'Insurance premium debit',
    ];
    const modes = ['SALARY', 'UPI', 'NEFT', 'BILL', 'ATM', 'EMI', 'ONLINE', 'INTEREST', 'CASH', 'RECHARGE', 'REWARD', 'FUEL', 'RECEIVABLE', 'FD'];
    const targets = ['FINS1001234567', 'FINS3009876543', null];

    for (let i = 0; i < 240; i += 1) {
      const date = new Date('2023-01-01T08:30:00Z');
      date.setDate(date.getDate() + i * 4);
      const account = accounts[i % accounts.length];
      const isCredit = i % 5 === 0 || i % 11 === 0;
      const amount = isCredit
        ? 1200 + ((i % 12) * 3500) + (i % 3) * 1000
        : 350 + ((i % 8) * 900) + (i % 5) * 250;
      const description = descriptions[i % descriptions.length];
      const mode = modes[i % modes.length];
      const targetAccountNumber = mode === 'NEFT' && i % 3 === 0 ? targets[i % targets.length] : null;

      transactions.push({
        id: 1000 + i + 1,
        accountId: account.id,
        accountNumber: account.accountNumber,
        type: isCredit ? 'CREDIT' : 'DEBIT',
        amount,
        description,
        referenceNumber: `${mode}-${date.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`,
        createdAt: date.toISOString(),
        mode,
        targetAccountNumber,
      });
    }

    return transactions;
  })(),
  cards: [
    {
      id: 201,
      cardHolderName: 'John Doe',
      maskedCardNumber: '**** 4821',
      expiryDate: '12/29',
      status: 'ACTIVE',
      cardType: 'DEBIT',
      variant: 'REGULAR',
      linkedAccountNumber: 'FINS2001112233',
      internationalEnabled: true,
      onlineEnabled: true,
    },
    {
      id: 202,
      cardHolderName: 'John Doe',
      maskedCardNumber: '**** 7624',
      expiryDate: '09/28',
      status: 'ACTIVE',
      cardType: 'CREDIT',
      scheme: 'GOLD',
      variant: 'REGULAR',
      creditLimit: 100000,
      availableLimit: 67500,
      internationalEnabled: true,
      onlineEnabled: true,
      perks: '2% cashback on dining and fuel',
    },
    {
      id: 203,
      cardHolderName: 'John Doe',
      maskedCardNumber: '**** 1115',
      expiryDate: '05/30',
      status: 'ACTIVE',
      cardType: 'CREDIT',
      scheme: 'PLATINUM',
      variant: 'REGULAR',
      creditLimit: 300000,
      availableLimit: 210000,
      internationalEnabled: true,
      onlineEnabled: true,
      perks: 'Airport lounge access and premium rewards',
    },
    {
      id: 204,
      cardHolderName: 'John Doe',
      maskedCardNumber: '**** 7004',
      expiryDate: '11/27',
      status: 'ACTIVE',
      cardType: 'PREPAID',
      scheme: 'PREPAID',
      variant: 'VIRTUAL',
      prepaidBalance: 8000,
      internationalEnabled: true,
      onlineEnabled: true,
    },
  ],
  loans: [
    {
      id: 301,
      loanType: 'HOME',
      loanNumber: 'HL-2026-001',
      purpose: 'Home purchase and renovation',
      principalAmount: 4500000,
      interestRate: 8.5,
      tenureMonths: 240,
      emiAmount: 39204,
      outstandingAmount: 4180000,
      totalInterest: 1870000,
      status: 'ACTIVE',
    },
    {
      id: 302,
      loanType: 'PERSONAL',
      loanNumber: 'PL-2026-002',
      purpose: 'Travel and medical expenses',
      principalAmount: 200000,
      interestRate: 12.5,
      tenureMonths: 24,
      emiAmount: 9456,
      outstandingAmount: 182500,
      totalInterest: 26744,
      status: 'APPROVED',
    },
  ],
  kycDocuments: [
    {
      id: 401,
      documentType: 'AADHAAR',
      status: 'APPROVED',
      fileName: 'aadhaar-demo.pdf',
    },
    {
      id: 402,
      documentType: 'PAN',
      status: 'APPROVED',
      fileName: 'pan-demo.pdf',
    },
  ],
  notifications: [
    {
      id: 501,
      title: 'Salary credited',
      body: 'Your salary of ₹1,85,000 has been credited to Savings.',
      read: false,
    },
    {
      id: 502,
      title: 'EMI due soon',
      body: 'Your next EMI of ₹39,204 is due on 28 June.',
      read: false,
    },
    {
      id: 503,
      title: 'Card offer',
      body: 'Enjoy 5% cashback on your Gold card this weekend.',
      read: false,
    },
  ],
});

let demoState = createInitialDemoState();

export const seedDemoSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', DEMO_TOKEN);
  localStorage.setItem('user', JSON.stringify(demoState.user));
};

export const getDemoState = () => clone(demoState);

export const createDemoResponse = (payload) => ({ data: { data: payload } });

export const getDemoDashboardPayload = () => {
  const state = getDemoState();
  const accounts = state.accounts.map((account) => ({ ...account }));
  const recentTransactions = state.transactions
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map((transaction) => ({ ...transaction }));

  return {
    profile: {
      firstName: state.user.firstName,
      lastName: state.user.lastName,
      email: state.user.email,
      username: state.user.username,
      phone: state.user.phone,
      panNumber: state.user.panNumber,
      kycStatus: state.user.kycStatus,
      city: state.user.city,
      state: state.user.state,
    },
    accounts,
    totalBalance: 1636500,
    totalAccounts: 3,
    activeLoans: 2,
    unreadNotifications: 3,
    recentTransactions,
  };
};

export const getDemoProfilePayload = () => {
  const state = getDemoState();
  return { ...state.user };
};

export const getDemoTransactionsPayload = (accountId, page = 0, filters = {}) => {
  const state = getDemoState();
  let transactions = state.transactions.filter(
    (transaction) => String(transaction.accountId) === String(accountId) || String(transaction.accountNumber) === String(accountId)
  );

  if (filters.type) {
    transactions = transactions.filter((transaction) => transaction.type === filters.type);
  }
  if (filters.fromDate) {
    transactions = transactions.filter((transaction) => transaction.createdAt >= filters.fromDate);
  }
  if (filters.toDate) {
    transactions = transactions.filter((transaction) => transaction.createdAt <= filters.toDate);
  }
  if (filters.minAmount) {
    transactions = transactions.filter((transaction) => transaction.amount >= Number(filters.minAmount));
  }
  if (filters.maxAmount) {
    transactions = transactions.filter((transaction) => transaction.amount <= Number(filters.maxAmount));
  }

  transactions = transactions.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pageSize = 20;
  const totalElements = transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const content = transactions.slice(page * pageSize, (page + 1) * pageSize).map((transaction) => ({ ...transaction }));

  return { content, totalPages, totalElements };
};

export const getDemoCardsPayload = () => getDemoState().cards.map((card) => ({ ...card }));
export const getDemoLoansPayload = () => getDemoState().loans.map((loan) => ({ ...loan }));
export const getDemoKycDocumentsPayload = () => getDemoState().kycDocuments.map((document) => ({ ...document }));
export const getDemoNotificationsPayload = (page = 0) => {
  const state = getDemoState();
  const pageSize = 10;
  const content = state.notifications.slice(page * pageSize, (page + 1) * pageSize).map((notification) => ({ ...notification }));
  return {
    content,
    totalPages: Math.max(1, Math.ceil(state.notifications.length / pageSize)),
    totalElements: state.notifications.length,
  };
};

export const applyDemoAccountCreation = (accountType) => {
  const newAccount = {
    id: Math.max(...demoState.accounts.map((account) => account.id), 0) + 1,
    accountNumber: `FINS${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    accountType,
    balance: 25000,
    ifscCode: 'FINS0001234',
    branchName: 'BKC Branch',
    status: 'ACTIVE',
  };
  demoState.accounts.push(newAccount);
  return newAccount;
};

export const applyDemoDeposit = (accountNumber, amount, description) => {
  const account = demoState.accounts.find((item) => item.accountNumber === accountNumber);
  if (!account) return null;
  account.balance += amount;
  demoState.transactions.unshift({
    id: Math.max(...demoState.transactions.map((item) => item.id), 0) + 1,
    accountId: account.id,
    accountNumber: account.accountNumber,
    type: 'CREDIT',
    amount,
    description: description || 'Cash deposit',
    referenceNumber: `DEMO-${Date.now()}`,
    createdAt: new Date().toISOString(),
    mode: 'CASH',
    targetAccountNumber: null,
  });
  return account;
};

export const applyDemoTransfer = (fromAccountNumber, toAccountNumber, amount, description) => {
  const sender = demoState.accounts.find((item) => item.accountNumber === fromAccountNumber);
  if (!sender) return null;
  sender.balance -= amount;
  const targetAccount = demoState.accounts.find((item) => item.accountNumber === toAccountNumber);
  if (targetAccount) {
    targetAccount.balance += amount;
  }
  demoState.transactions.unshift({
    id: Math.max(...demoState.transactions.map((item) => item.id), 0) + 1,
    accountId: sender.id,
    accountNumber: sender.accountNumber,
    type: 'DEBIT',
    amount,
    description: description || 'Fund transfer',
    referenceNumber: `TRF-${Date.now()}`,
    createdAt: new Date().toISOString(),
    mode: 'NEFT',
    targetAccountNumber: toAccountNumber,
  });
  return sender;
};

export const applyDemoCardAction = (cardId, action) => {
  const card = demoState.cards.find((item) => item.id === Number(cardId));
  if (!card) return null;
  if (action === 'BLOCK') card.status = 'BLOCKED';
  if (action === 'UNBLOCK') card.status = 'ACTIVE';
  if (action === 'ENABLE_INTERNATIONAL') card.internationalEnabled = true;
  if (action === 'DISABLE_INTERNATIONAL') card.internationalEnabled = false;
  if (action === 'ENABLE_ONLINE') card.onlineEnabled = true;
  if (action === 'DISABLE_ONLINE') card.onlineEnabled = false;
  return card;
};

export const applyDemoIssueCard = (cardData) => {
  const newCard = {
    id: Math.max(...demoState.cards.map((card) => card.id), 0) + 1,
    cardHolderName: demoState.user.firstName + ' ' + demoState.user.lastName,
    maskedCardNumber: `**** ${Math.floor(1000 + Math.random() * 9000)}`,
    expiryDate: '12/31',
    status: 'ACTIVE',
    cardType: 'DEBIT',
    variant: 'REGULAR',
    linkedAccountNumber: cardData.accountNumber || cardData.accountId,
    internationalEnabled: true,
    onlineEnabled: true,
  };
  demoState.cards.push(newCard);
  return newCard;
};

export const applyDemoUploadKyc = (kycForm) => {
  const newDocument = {
    id: Math.max(...demoState.kycDocuments.map((document) => document.id), 0) + 1,
    documentType: kycForm.documentType,
    status: 'UPLOADED',
    fileName: kycForm.fileName || `${kycForm.documentType.toLowerCase()}-demo.pdf`,
  };
  demoState.kycDocuments.push(newDocument);
  return newDocument;
};

export const markDemoNotificationsRead = () => {
  demoState.notifications = demoState.notifications.map((notification) => ({ ...notification, read: true }));
  return demoState.notifications;
};

export const createDemoDocumentUrl = (documentId) => {
  if (typeof window === 'undefined') return 'about:blank';
  const blob = new Blob([`FinSecure demo document ${documentId}`], { type: 'application/pdf' });
  return window.URL.createObjectURL(blob);
};
