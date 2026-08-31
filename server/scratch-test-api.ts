import 'dotenv/config'

async function main() {
  const url = 'http://localhost:4000/api/admin/bookings?search=Dhruv&page=1&pageSize=5'
  console.log(`Fetching: ${url}`)
  try {
    const res = await fetch(url, {
      headers: {
        'x-admin-secret': 'admin-dev-secret',
        'Content-Type': 'application/json'
      }
    })
    console.log(`Status: ${res.status} ${res.statusText}`)
    const data = await res.json()
    console.log('Response data:', JSON.stringify(data, null, 2))
  } catch (err: any) {
    console.error('Error fetching API:', err.message || err)
  }
}

main()
