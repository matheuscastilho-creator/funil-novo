const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const dados = {
    links: {},
    stats: {}
};

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
            input { background: #0a0a1a; color: #fff; border: 1px solid #333; width: 300px; }
            button { background: #f5c842; color: #000; font-weight: bold; cursor: pointer; padding: 10px 30px; }
            button:hover { background: #ffd700; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
            a { color: #64b5f6; }
            .btn-delete { background: #e94560; color: #fff; padding: 5px 15px; }
            .btn-delete:hover { background: #c62840; }
        </style>
    </head>
    <body>
        <h1>📊 Painel de Controle</h1>
        <div class="card">
            <h2>Criar Link</h2>
            <input type="text" id="linkId" placeholder="ID (ex: teste)">
            <input type="text" id="linkDestino" placeholder="Destino (ex: https://google.com)">
            <button onclick="criarLink()">🚀 Criar</button>
        </div>
        <div class="card">
            <h2>Links Cadastrados</h2>
            <div id="listaLinks">Carregando...</div>
        </div>

        <script>
            // ============ CARREGAR LINKS ============
            async function carregarLinks() {
                try {
                    const response = await fetch('/api/links');
                    const links = await response.json();
                    
                    let html = '<table><tr><th>ID</th><th>Destino</th><th>URL</th><th>Ações</th></tr>';
                    
                    const ids = Object.keys(links);
                    if (ids.length === 0) {
                        html = '<p style="color: #666;">Nenhum link cadastrado ainda.</p>';
                    } else {
                        for (const id of ids) {
                            const link = links[id];
                            const url = window.location.origin + '/' + id;
                            html += '<tr>' +
                                '<td><strong>' + id + '</strong></td>' +
                                '<td>' + link.destino + '</td>' +
                                '<td><a href="' + url + '" target="_blank">' + url + '</a></td>' +
                                '<td><button class="btn-delete" onclick="deletarLink(\'' + id + '\')">🗑️</button></td>' +
                            '</tr>';
                        }
                        html += '</table>';
                    }
                    
                    document.getElementById('listaLinks').innerHTML = html;
                } catch (error) {
                    document.getElementById('listaLinks').innerHTML = '<p style="color: #e94560;">Erro ao carregar links</p>';
                    console.error('Erro:', error);
                }
            }

            // ============ CRIAR LINK ============
            async function criarLink() {
                const id = document.getElementById('linkId').value.trim();
                const destino = document.getElementById('linkDestino').value.trim();
                
                if (!id || !destino) {
                    alert('⚠️ Preencha ID e Destino!');
                    return;
                }
                
                try {
                    const response = await fetch('/api/links', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, destino })
                    });
                    
                    if (response.ok) {
                        alert('✅ Link criado com sucesso!');
                        document.getElementById('linkId').value = '';
                        document.getElementById('linkDestino').value = '';
                        carregarLinks();
                    } else {
                        alert('❌ Erro ao criar link');
                    }
                } catch (error) {
                    alert('❌ Erro ao criar link');
                    console.error('Erro:', error);
                }
            }

            // ============ DELETAR LINK ============
            async function deletarLink(id) {
                if (!confirm('Deletar o link "' + id + '"?')) return;
                
                try {
                    const response = await fetch('/api/links/' + id, { method: 'DELETE' });
                    if (response.ok) {
                        alert('✅ Link deletado!');
                        carregarLinks();
                    } else {
                        alert('❌ Erro ao deletar link');
                    }
                } catch (error) {
                    alert('❌ Erro ao deletar link');
                    console.error('Erro:', error);
                }
            }

            // ============ INICIAR ============
            carregarLinks();
        </script>
    </body>
    </html>
    `);
});

// ============ API ============
app.get('/api/links', (req, res) => {
    try {
        res.json(dados.links);
    } catch(e) {
        res.status(500).json({ erro: 'Erro interno' });
    }
});

app.post('/api/links', (req, res) => {
    try {
        const { id, destino } = req.body;
        if (!id || !destino) {
            return res.status(400).json({ erro: 'Faltou id ou destino' });
        }
        dados.links[id] = {
            destino,
            canal: 'padrao',
            campanha: id,
            utm_source: 'whatsapp'
        };
        res.json({ sucesso: true });
    } catch(e) {
        res.status(500).json({ erro: 'Erro interno' });
    }
});

app.delete('/api/links/:id', (req, res) => {
    try {
        const id = req.params.id;
        if (dados.links[id]) {
            delete dados.links[id];
            res.json({ sucesso: true });
        } else {
            res.status(404).json({ erro: 'Link não encontrado' });
        }
    } catch(e) {
        res.status(500).json({ erro: 'Erro interno' });
    }
});

// ============ FUNIL ============
app.get('/:id', (req, res) => {
    try {
        const id = req.params.id;

        if (id === 'admin' || id === 'api') {
            return res.status(404).send('Rota não encontrada');
        }

        const link = dados.links[id];
        if (!link) {
            return res.status(404).send(`
                <h1>🔗 Link não encontrado</h1>
                <p>O link "${id}" não existe.</p>
                <a href="/admin">Voltar ao painel</a>
            `);
        }

        if (!dados.stats[id]) dados.stats[id] = { total: 0 };
        dados.stats[id].total++;
        console.log('📊 Clique em', id, 'Total:', dados.stats[id].total);

        // PÁGINA DO MEIO (WHITE LABEL)
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta property="og:title" content="Oferta Especial">
            <meta property="og:description" content="Clique e confira">
            <meta property="og:image" content="https://placehold.co/1200x630/1a1a2e/f5c842?text=Oferta">
            <meta name="robots" content="noindex, nofollow">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { background: #f5f5f5; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; }
                .card { background: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                h1 { font-size: 24px; color: #1a1a1a; margin-bottom: 10px; }
                p { color: #666; margin-bottom: 20px; }
                .loader { border: 4px solid #f3f3f3; border-top: 4px solid #1a1a1a; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🎁 Acesse sua oferta</h1>
                <p>Preparando seu conteúdo exclusivo...</p>
                <div class="loader"></div>
            </div>
            <script>
                setTimeout(function() {
                    window.location.href = '${link.destino}?ch=${link.canal}&campanha=${link.campanha}&utm_source=${link.utm_source}';
                }, 1500);
            </script>
        </body>
        </html>
        `;

        res.send(html);
    } catch(e) {
        console.error('Erro no funil:', e);
        res.status(500).send('Erro interno no servidor');
    }
});

// ============ ROTA RAIZ ============
app.get('/', (req, res) => {
    res.send(`
        <h1>🚀 Funil funcionando!</h1>
        <p>Links cadastrados: ${Object.keys(dados.links).length}</p>
        <p><a href="/admin">📊 Acessar Painel Administrativo</a></p>
    `);
});

app.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
});
