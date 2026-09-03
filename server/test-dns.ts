import dns from 'dns';

const regions = [
  'ap-south-1',
  'us-east-1',
  'eu-central-1',
  'us-west-1',
  'ap-southeast-1',
  'eu-west-1',
  'sa-east-1'
];

console.log('Testing Supabase pooler host resolutions...');

regions.forEach(r => {
  const host = `aws-0-${r}.pooler.supabase.com`;
  dns.lookup(host, (err, addr) => {
    if (!err) {
      console.log(`FOUND: ${host} -> ${addr}`);
    }
  });
});
