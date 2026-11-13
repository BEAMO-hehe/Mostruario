import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import supabase from './db/config.js';
import categoriasRoutes from './routes/categoriasRoutes.js';
import produtoRouter from './routes/produtosRoutes.js';
import usuarioRouter from './routes/usuariosRoutes.js';
import lojasRouter from './routes/lojasRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PORT recebe o valor do .env PORT OU 3333
const PORT = process.env.PORT || 3333;

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos de upload
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Servir Front-end Estático (Híbrido: local e fallback)
const localPublic = path.resolve(__dirname, '../public');
const rootPublic = path.resolve(__dirname, '../../public');
const rootSite = path.resolve(__dirname, '../../site');

const staticPath = fs.existsSync(localPublic) 
    ? localPublic 
    : (fs.existsSync(rootPublic) ? rootPublic : rootSite);

app.use(express.static(staticPath));
app.use('/admin', express.static(path.join(staticPath, 'admin')));

// Rotas de páginas estáticas
app.get('/admin', (req, res) => res.sendFile(path.join(staticPath, 'admin/login.html')));
app.get('/', (req, res) => res.sendFile(path.join(staticPath, 'index.html')));

// Rota de status/healthcheck da API (Restrita a /api e /api/health)
app.get(['/api', '/api/health'], (req, res) => {
    return res.status(200).json({
        status: 'online',
        banco: 'Supabase (PostgreSQL)',
        mensagem: 'API do Mostruário conectada com sucesso ao Supabase!',
        timestamp: new Date().toISOString()
    });
});

// Rotas da API
app.use('/api/categorias', categoriasRoutes);
app.use('/api/produtos', produtoRouter);
app.use('/api/usuarios', usuarioRouter);
app.use('/api/lojas', lojasRouter);

// Servidor Híbrido: inicia o listen apenas em ambiente local tradicional (não Vercel Serverless)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Rodando em http://localhost:${PORT}`);
    });
}

export default app;
