import http from 'http';

http.get('http://localhost:3000/', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('HTML loaded. Fetching client script...');
    // Extract the src of the script tag
    const match = data.match(/<script type="module" src="([^"]+)"><\/script>/);
    if (match && match[1]) {
      http.get('http://localhost:3000' + match[1], (res2) => {
        console.log('Script status:', res2.statusCode);
      }).on('error', (err) => console.log('Script error:', err.message));
    } else {
      console.log('No script tag found');
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
