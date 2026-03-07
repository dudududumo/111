const auth = { currentUser: null };
try {
  const x = auth.currentUser?.providerData.map(p => p);
  console.log('Success:', x);
} catch (e) {
  console.log('Error:', e.message);
}
