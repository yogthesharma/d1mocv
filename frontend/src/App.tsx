import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((body: { status: string }) => setStatus(body.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Wind forecast desk</h1>
      <p>API status: {status}</p>
    </main>
  )
}
