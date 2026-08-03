const token = 'fake-token';
fetch('http://localhost:3000/api/me', {
  headers: {
    Authorization: `Bearer ${token}`
  }
}).then(r => r.json()).then(console.log);
