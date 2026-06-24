export const DEMO_MODE = true;
export const DEMO_TOKEN = 'demo-employee-jwt-token-for-finsecure-recruiter-demo';

const clone = (value) => JSON.parse(JSON.stringify(value));

const createAdditionalCustomers = () => {
  const firstNames = ['Aditi', 'Vikram', 'Neha', 'Karan', 'Sonia', 'Raghav', 'Pooja', 'Harsh', 'Isha', 'Mohan', 'Anjali', 'Deepak', 'Kavya', 'Suresh', 'Nisha', 'Rohan', 'Tara', 'Arjun', 'Manya', 'Aditya', 'Sakshi', 'Bhavya', 'Dev', 'Ritika', 'Nikhil', 'Ananya', 'Kunal', 'Yash', 'Parth', 'Sneha', 'Tanvi', 'Gaurav', 'Shreya', 'Akash', 'Varun'];
  const lastNames = ['Shah', 'Rao', 'Kapoor', 'Singh', 'Verma', 'Menon', 'Agarwal', 'Gupta', 'Malhotra', 'Patil', 'Joshi', 'Nair', 'Desai', 'Iyer', 'Bhatia', 'Chopra', 'Khan', 'Sen', 'Roy', 'Das', 'Jain', 'Mishra', 'Dutta', 'Sethi', 'Tripathi', 'Kulkarni', 'Bose', 'Bharadwaj', 'Reddy', 'Gowda', 'Thakur', 'Saxena', 'Pawar', 'Bhat', 'Nadkarni'];
  const kycStatuses = ['APPROVED', 'PENDING', 'SUBMITTED', 'UNDER_REVIEW'];

  return Array.from({ length: 35 }, (_, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[(index + 7) % lastNames.length];
    const usernameBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    const panPrefix = Array.from({ length: 5 }, (_, i) => String.fromCharCode(65 + ((index + i) % 26))).join('');
    const panSuffix = String(1000 + index).slice(-4);
    const panLetter = String.fromCharCode(65 + ((index + 5) % 26));
    const phone = `${9000000000 + index}`;

    return {
      id: 7 + index,
      customerName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      username: `${usernameBase}${index > 0 ? index : ''}`,
      email: `${usernameBase}${index > 0 ? index : ''}@mail.com`,
      phone,
      panNumber: `${panPrefix}${panSuffix}${panLetter}`,
      accountNumber: `FINS${String(2000000000 + index).slice(-10)}`,
      status: 'ACTIVE',
      kycStatus: kycStatuses[index % kycStatuses.length],
      createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    };
  });
};

const createInitialDemoState = () => ({
  user: {
    id: 501,
    email: 'sara.dev@finsecure.com',
    username: 'sara.dev',
    role: 'ROLE_EMPLOYEE',
    name: 'Sara Dev',
    department: 'Retail Banking',
  },
  dashboard: {
    totalCustomers: 1842,
    activeAccounts: 1423,
    pendingKyc: 17,
    pendingLoans: 6,
    monthlyDeposits: 1285000,
    reviewsToday: 9,
  },
  customers: [
    {
      id: 1,
      customerName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      username: 'john.doe',
      email: 'john.doe@gmail.com',
      phone: '9876543210',
      panNumber: 'ABCDE1234F',
      accountNumber: 'FINS2001112233',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      createdAt: '2024-03-18T10:00:00Z',
    },
    {
      id: 2,
      customerName: 'Priya Sharma',
      firstName: 'Priya',
      lastName: 'Sharma',
      username: 'priya.s',
      email: 'priya.sharma@gmail.com',
      phone: '8765432109',
      panNumber: 'BCDEF2345G',
      accountNumber: 'FINS1001234567',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      createdAt: '2024-01-12T09:15:00Z',
    },
    {
      id: 3,
      customerName: 'Rahul Mehta',
      firstName: 'Rahul',
      lastName: 'Mehta',
      username: 'rahul.m',
      email: 'rahul.mehta@gmail.com',
      phone: '7654321098',
      panNumber: 'CDEFG3456H',
      accountNumber: 'FINS3009876543',
      status: 'ACTIVE',
      kycStatus: 'UNDER_REVIEW',
      createdAt: '2024-05-04T14:20:00Z',
    },
    {
      id: 4,
      customerName: 'Nina Rao',
      firstName: 'Nina',
      lastName: 'Rao',
      username: 'nina.rao',
      email: 'nina.rao@gmail.com',
      phone: '6543210987',
      panNumber: 'DEFGH4567J',
      accountNumber: 'FINS2007778888',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      createdAt: '2023-10-01T08:45:00Z',
    },
    {
      id: 5,
      customerName: 'Aarav Patel',
      firstName: 'Aarav',
      lastName: 'Patel',
      username: 'aarav.p',
      email: 'aarav.patel@gmail.com',
      phone: '5432109876',
      panNumber: 'EFGHI5678K',
      accountNumber: 'FINS2005566777',
      status: 'ACTIVE',
      kycStatus: 'PENDING',
      createdAt: '2024-06-10T11:05:00Z',
    },
    {
      id: 6,
      customerName: 'Meera Iyer',
      firstName: 'Meera',
      lastName: 'Iyer',
      username: 'meera.i',
      email: 'meera.iyer@gmail.com',
      phone: '4321098765',
      panNumber: 'FGHIJ6789L',
      accountNumber: 'FINS1009988776',
      status: 'ACTIVE',
      kycStatus: 'SUBMITTED',
      createdAt: '2024-06-12T09:30:00Z',
    },
    ...createAdditionalCustomers(),
  ],
  pendingKyc: [
    {
      id: 701,
      customerId: 3,
      customerName: 'Rahul Mehta',
      email: 'rahul.mehta@gmail.com',
      documentType: 'AADHAAR',
      documentNumber: '1234-5678-9012',
      hasFile: true,
      createdAt: '2024-05-04T14:20:00Z',
      status: 'SUBMITTED',
    },
    {
      id: 702,
      customerId: 6,
      customerName: 'Meera Iyer',
      email: 'meera.iyer@gmail.com',
      documentType: 'PAN',
      documentNumber: 'FGHIJ6789L',
      hasFile: true,
      createdAt: '2024-06-12T09:30:00Z',
      status: 'SUBMITTED',
    },
    {
      id: 703,
      customerId: 5,
      customerName: 'Aarav Patel',
      email: 'aarav.patel@gmail.com',
      documentType: 'DRIVING_LICENSE',
      documentNumber: 'DL-2024-11823',
      hasFile: true,
      createdAt: '2024-06-14T16:40:00Z',
      status: 'UNDER_REVIEW',
    },
    {
      id: 704,
      customerId: 2,
      customerName: 'Priya Sharma',
      email: 'priya.sharma@gmail.com',
      documentType: 'PASSPORT',
      documentNumber: 'P1234567',
      hasFile: false,
      createdAt: '2024-06-15T08:10:00Z',
      status: 'UPLOADED',
    },
  ],
  pendingLoans: [
    {
      id: 801,
      loanNumber: 'HL-2024-801',
      loanType: 'HOME',
      principalAmount: 550000,
      emiAmount: 12440,
      tenureMonths: 60,
      interestRate: 8.5,
      totalInterest: 198000,
      purpose: 'Home purchase',
      status: 'APPLIED',
      createdAt: '2024-05-08T09:20:00Z',
      customerName: 'Asha Menon',
      accountNumber: 'FINS2005554444',
    },
    {
      id: 802,
      loanNumber: 'PL-2024-802',
      loanType: 'PERSONAL',
      principalAmount: 180000,
      emiAmount: 8450,
      tenureMonths: 24,
      interestRate: 12.5,
      totalInterest: 23000,
      purpose: 'Vehicle purchase',
      status: 'APPLIED',
      createdAt: '2024-05-09T12:15:00Z',
      customerName: 'Rohan Bhatia',
      accountNumber: 'FINS2003332222',
    },
    {
      id: 803,
      loanNumber: 'PL-2024-803',
      loanType: 'PERSONAL',
      principalAmount: 320000,
      emiAmount: 13500,
      tenureMonths: 30,
      interestRate: 11.25,
      totalInterest: 45000,
      purpose: 'Home renovation',
      status: 'UNDER_REVIEW',
      createdAt: '2024-06-11T10:40:00Z',
      customerName: 'Aarav Patel',
      accountNumber: 'FINS2005566777',
    },
    {
      id: 804,
      loanNumber: 'EL-2024-804',
      loanType: 'EDUCATION',
      principalAmount: 850000,
      emiAmount: 18500,
      tenureMonths: 48,
      interestRate: 9.2,
      totalInterest: 128000,
      purpose: 'Higher education',
      status: 'APPLIED',
      createdAt: '2024-06-16T13:25:00Z',
      customerName: 'Meera Iyer',
      accountNumber: 'FINS1009988776',
    },
  ],
  employees: [
    {
      id: 901,
      name: 'Sara Dev',
      email: 'sara.dev@finsecure.com',
      role: 'ROLE_EMPLOYEE',
      status: 'ACTIVE',
    },
    {
      id: 902,
      name: 'Mohan Raj',
      email: 'mohan.raj@finsecure.com',
      role: 'ROLE_ADMIN',
      status: 'ACTIVE',
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

export const getDemoDashboardPayload = () => ({ ...getDemoState().dashboard });
export const getDemoCustomersPayload = (page = 0, search = '', sort = 'createdAt', dir = 'desc') => {
  const customers = getDemoState().customers.filter((customer) => {
    const text = `${customer.customerName} ${customer.email} ${customer.accountNumber}`.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });
  const sorted = [...customers].sort((a, b) => {
    const comparison = a[sort] > b[sort] ? 1 : -1;
    return dir === 'desc' ? -comparison : comparison;
  });
  return {
    content: sorted.slice(page * 20, (page + 1) * 20),
    totalPages: Math.max(1, Math.ceil(sorted.length / 20)),
    totalElements: sorted.length,
  };
};

export const getDemoCustomerByAccountPayload = (accountNumber) => getDemoState().customers.find((customer) => customer.accountNumber === accountNumber) || null;
export const getDemoPendingKycPayload = (page = 0) => ({
  content: getDemoState().pendingKyc.slice(page * 20, (page + 1) * 20),
  totalPages: Math.max(1, Math.ceil(getDemoState().pendingKyc.length / 20)),
  totalElements: getDemoState().pendingKyc.length,
});

export const getDemoPendingLoansPayload = (page = 0) => ({
  content: getDemoState().pendingLoans.slice(page * 20, (page + 1) * 20),
  totalPages: Math.max(1, Math.ceil(getDemoState().pendingLoans.length / 20)),
  totalElements: getDemoState().pendingLoans.length,
});

export const getDemoAllEmployeesPayload = () => getDemoState().employees;
