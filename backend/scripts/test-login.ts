import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'kavya@bharatbuil.ai',
      password: 'Bharatbuild@123'
    });
    console.log('LOGIN SUCCESS!');
    console.log('User:', res.data.data?.user?.email);
    console.log('Role:', res.data.data?.user?.role?.name);
    console.log('Org:', res.data.data?.user?.organization?.name);
  } catch (err: any) {
    console.log('LOGIN FAILED');
    console.log('Status:', err.response?.status);
    console.log('Error:', err.response?.data?.message || err.message);
  }
}

test();
