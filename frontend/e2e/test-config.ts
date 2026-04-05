/**
 * Test Configuration - User credentials and test data
 */

export const TEST_USERS = {
  admin: {
    email: 'admin@smartedu.com',
    password: 'Test@123!',
    role: 'Admin',
    branch: 'All Branches'
  },
  manager_hyd: {
    email: 'manager.hyd@smartedu.com',
    password: 'Test@123!',
    role: 'Branch Manager',
    branch: 'Hyderabad Main'
  },
  manager_blr: {
    email: 'manager.blr@smartedu.com',
    password: 'Test@123!',
    role: 'Branch Manager',
    branch: 'Bangalore Central'
  },
  teamlead_hyd: {
    email: 'teamlead.hyd@smartedu.com',
    password: 'Test@123!',
    role: 'Team Lead',
    branch: 'Hyderabad Main'
  },
  telecaller1_hyd: {
    email: 'telecaller1.hyd@smartedu.com',
    password: 'Test@123!',
    role: 'Telecaller',
    branch: 'Hyderabad Main',
    expectedLeads: 5
  },
  telecaller2_hyd: {
    email: 'telecaller2.hyd@smartedu.com',
    password: 'Test@123!',
    role: 'Telecaller',
    branch: 'Hyderabad Main',
    expectedLeads: 1
  },
  telecaller1_blr: {
    email: 'telecaller1.blr@smartedu.com',
    password: 'Test@123!',
    role: 'Telecaller',
    branch: 'Bangalore Central',
    expectedLeads: 2
  },
  counselor_hyd: {
    email: 'counselor.hyd@smartedu.com',
    password: 'Test@123!',
    role: 'Counselor',
    branch: 'Hyderabad Main'
  }
};

export const TEST_LEADS = {
  telecaller1_hyd: [
    { name: 'Sanjay Verma', phone: '9876543301', stage: 'Inquiry' },
    { name: 'Meera Joshi', phone: '9876543302', stage: 'Inquiry' },
    { name: 'Arjun Singh', phone: '9876543303', stage: 'Interested' },
    { name: 'Pooja Rao', phone: '9876543304', stage: 'Inquiry' },
    { name: 'Vikram Desai', phone: '9876543305', stage: 'Interested' },
  ],
  telecaller2_hyd: [
    { name: 'Amit Patel', phone: '9876543212', stage: 'Inquiry' }
  ],
  completed: [
    { name: 'Rahul Kumar', phone: '9876543210', stage: 'Admitted', status: 'ADMITTED' },
    { name: 'Sneha Reddy', phone: '9876543220', stage: 'Enrolled', status: 'ENROLLED' }
  ],
  dropped: [
    { name: 'Priya Sharma', phone: '9876543211', stage: 'Dropped', status: 'DROPPED' }
  ]
};

export const API_BASE_URL = 'http://localhost:3001/api';
