import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('site');
const destPublic = path.resolve('public');
const destApiPublic = path.resolve('api/public');

[destPublic, destApiPublic].forEach(dest => {
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(srcDir, dest, { recursive: true });
});

console.log('✅ Build concluído: arquivos estáticos sincronizados com sucesso.');
