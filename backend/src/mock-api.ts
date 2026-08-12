import express from 'express';
const app = express();
app.use(express.json());

// Logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mock endpoints
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/auth/me', (req, res) => res.json({ id: '1', email: 'tnicodemos@gmail.com', roles: [{ role: 'admin_global' }] }));
app.get('/api/companies', (req, res) => res.json([{ id: '7b7b26dd-7594-42d6-82f5-623629d9d3c9', name: 'Empresa Teste', legalName: 'Empresa Teste LTDA', active: true }]));
app.get('/api/farms', (req, res) => res.json([]));
app.get('/api/regionals', (req, res) => res.json([]));
app.get('/api/plots', (req, res) => res.json([]));
app.get('/api/field/me', (req, res) => res.json({ user: { id: '1', email: 'tnicodemos@gmail.com' }, roles: ['admin_global'], primaryRole: 'admin', isAdmin: true, companies: [], assignments: [] }));

// Fallback for other API routes
app.use((req, res) => {
  console.warn(`Unhandled API route: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not implemented in mock', path: req.url });
});

app.listen(4000, () => console.log('Mock API running on 4000'));
