import { createServer } from 'node:http';

const server = createServer((req, res) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Simple router
  if (url.pathname === '/api/health') {
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (url.pathname === '/api/auth/me') {
    res.end(JSON.stringify({ id: '1', email: 'tnicodemos@gmail.com', roles: [{ role: 'admin_global' }] }));
    return;
  }

  if (url.pathname === '/api/companies') {
    res.end(JSON.stringify([{ id: '7b7b26dd-7594-42d6-82f5-623629d9d3c9', name: 'Empresa Teste', legalName: 'Empresa Teste LTDA', active: true }]));
    return;
  }

  if (url.pathname === '/api/farms') {
    res.end(JSON.stringify([
      { 
        id: 'farm-1', 
        name: 'Fazenda Santa Maria', 
        code: 'FSM-01', 
        city: 'São José do Rio Preto', 
        state: 'SP', 
        totalAreaHa: 150.5, 
        owner: 'João Silva',
        active: true
      },
      { 
        id: 'farm-2', 
        name: 'Seringal Boa Esperança', 
        code: 'SBE-02', 
        city: 'Mirassol', 
        state: 'SP', 
        totalAreaHa: 85.0, 
        owner: 'Maria Oliveira',
        active: true
      }
    ]));
    return;
  }

  if (url.pathname === '/api/regionals') {
    res.end(JSON.stringify([]));
    return;
  }

  if (url.pathname === '/api/plots') {
    res.end(JSON.stringify([]));
    return;
  }

  if (url.pathname === '/api/field/me') {
    res.end(JSON.stringify({ user: { id: '1', email: 'tnicodemos@gmail.com' }, roles: ['admin_global'], primaryRole: 'admin', isAdmin: true, companies: [], assignments: [] }));
    return;
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    // Basic mock login
    res.end(JSON.stringify({
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token'
    }));
    return;
  }

  console.warn(`Unhandled API route: ${req.method} ${url.pathname}`);
  res.statusCode = 404;
  res.end(JSON.stringify({ message: 'Route not implemented in mock', path: url.pathname }));
});

server.listen(4000, '0.0.0.0', () => {
  console.log('Mock API running on 4000 (Pure Node)');
});
