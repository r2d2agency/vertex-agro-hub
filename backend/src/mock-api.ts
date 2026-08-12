import express from 'express';
const app = express();
app.use(express.json());

// Mock endpoints to fix the 500 errors in the preview
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/auth/me', (req, res) => res.json({ id: '1', email: 'tnicodemos@gmail.com', roles: [{ role: 'admin_global' }] }));
app.get('/api/companies', (req, res) => res.json([{ id: '7b7b26dd-7594-42d6-82f5-623629d9d3c9', name: 'Empresa Teste', legalName: 'Empresa Teste LTDA', active: true }]));
app.get('/api/farms', (req, res) => res.json([]));
app.get('/api/regionals', (req, res) => res.json([]));
app.get('/api/field/me', (req, res) => res.json({ user: { id: '1', email: 'tnicodemos@gmail.com' }, roles: ['admin_global'], primaryRole: 'admin', isAdmin: true, companies: [], assignments: [] }));

app.listen(4000, () => console.log('Mock API running on 4000'));
