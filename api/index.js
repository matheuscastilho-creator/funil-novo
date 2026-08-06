const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configuração em memória
const dados = { links: {}, stats: {} };

// ============ PAINEL ADMIN ============
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>📊 Painel</title>
        <style>
            body { font-family: Arial; background: #0a0a1a; color: #fff; padding: 20px; }
            .card { background: #1a1a2e; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            input, button { padding: 10px; margin: 5px; border-radius: 5px; border: none; }
            input { background: #0a0a1a; color: #fff; border: 1px solid #333; width: 200px; }
            button { background: #f5c842; color: #000; font-weight: bold; cursor: pointer; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
        </style>
    </head>
    <body>
        <h1>📊 Painel de Controle</h1>
        <div class="card">
            <h2>Criar Link</h2>
            <input type="text" id="id" placeholder="ID (ex: teste)">
            <input type="text" id="destino" placeholder="Destino (ex: https://google.com)">
            <button onclick="criar()">Criar</button>
        </div>
        <div class="card">
            <h2>Links</h2>
            <div id="links"></div>
        </div>
        <script>
            async function carregar() {
                const r = await fetch('/api/links');
                const links = await r.json();
                let html = '<table><tr><th>ID</th><th>Destino</th><th>URL</th><th>Ações</th></tr>';
                for (const [id, link] of Object.entries(links)) {
                    const url = window.location.origin + '/' + id;
                    html += \`
                        <tr>
                            <td>\${id}</td>
                            <td>\${link.destino}</td>
                            <td><a href="\${url}" target="_blank">\${url}</a></td>
                            <td><button onclick="deletar('\${id}')">🗑️</button></td>
                        </tr>
                    \`;
                }
                html += '</table>';
                document.getElementById('links').innerHTML = html;
            }
            async function criar() {
                const id = document.getElementById('id').value;
                const destino = document.getElementById('destino').value;
                await fetch('/api/links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, destino })
                });
                carregar();
            }
            async function deletar(id) {
                await fetch('/api/links/' + id, { method: 'DELETE' });
                carregar();
            }
            carregar();
        </script>
    </body>
    </html>
    `);
});

// ============ API ============
app.get('/api/links', (req, res) => {
    res.json(dados.links);
});

app.post('/api/links', (req, res) => {
    const { id, destino } = req.body;
    if (!id || !destino) return res.status(400).json({ erro: 'Faltou id ou destino' });
    dados.links[id] = { destino, canal: 'padrao', campanha: id, utm_source: 'whatsapp' };
    res.json({ sucesso: true });
});

app.delete('/api/links/:id', (req, res) => {
    delete dados.links[req.params.id];
    res.json({ sucesso: true });
});

// ============ FUNIL ============
app.get('/:id', (req, res) => {
    const id = req.params.id;
    const link = dados.links[id];
    if (!link) return res.status(404).send('Link não encontrado');
    
    // Registra clique
    if (!dados.stats[id]) dados.stats[id] = { total: 0 };
    dados.stats[id].total++;
    console.log('📊 Clique em', id, 'Total:', dados.stats[id].total);
    
    // Página do meio (branca)
    res.send(\`
    <!DOCTYPE html>
    <html>
    <head>
        <meta property="og:title" content="Oferta Especial">
        <meta property="og:description" content="Clique e confira">
        <meta property="og:image" content="https://placehold.co/1200x630/1a1a2e/f5c842?text=Oferta">
        <style>
            body { background: #f5f5f5; font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 20px; text-align: center; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #1a1a1a; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>🎁 Acesse sua oferta</h1>
            <div class="loader"></div>
            <p>Redirecionando...</p>
        </div>
        <script>
            setTimeout(function() {
                window.location.href = '\${link.destino}?ch=\${link.canal}&campanha=\${link.campanha}&utm_source=\${link.utm_source}';
            }, 1500);
        </script>
    </body>
    </html>
    \`);
});

app.get('/', (req, res) => {
    res.send('<h1>🚀 Funil funcionando!</h1><p><a href="/admin">Admin</a></p>');
});

app.listen(PORT, () => {
    console.log('🚀 Rodando na porta', PORT);
});