import http from 'http';

http.get('http://localhost:3000/', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const match = data.match(/<script type="module" src="([^"]+)"><\/script>/);
    if (match && match[1]) {
      http.get('http://localhost:3000' + match[1], (res2) => {
        let jsData = '';
        res2.on('data', (chunk) => { jsData += chunk; });
        res2.on('end', () => {
          console.log('Script length:', jsData.length);
          console.log('Script start:', jsData.substring(0, 100));
        });
      }).on('error', (err) => console.log('Script error:', err.message));
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
