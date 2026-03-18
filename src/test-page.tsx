export function TestPage() {
  return (
    <div style={{ padding: '20px', color: 'white', background: '#0f172a', minHeight: '100vh' }}>
      <h1>Test Page</h1>
      <p>If you can see this, React is working!</p>
      <p>Backend API: <a href="http://localhost:4000/health" target="_blank" style={{ color: '#6366f1' }}>http://localhost:4000/health</a></p>
      <p>Yjs Server: ws://localhost:3001</p>
    </div>
  );
}
