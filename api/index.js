const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============ TOKEN DE ACESSO ============
const TOKEN = 'meutoken123'; // ← MUDE ISSO!

// ============ CONFIGURAÇÕES ============
const supabase = createClient(
    'https://ucodtkzqxcxytopllmau.supabase.co',
    'sb_publishable_iMkFeVPo1eIc0qa3ZL1erg_ce_r0_tM'
);

// ============ MIDDLEWARE ============
function verificarToken(req, res, next) {
    const token = req.query.token;
    if (token === TOKEN) {
        return next();
    }
    res.status(401).send('🔒 Acesso negado. Use ?token=' + TOKEN);
}

// ============ ROTAS PÚBLICAS ============
app.get('/', (req, res) => {
    res.send(`
        <h1>🚀 Funil funcionando!</h1>
        <p><a href="/admin?token=${TOKEN}">📊 Painel Admin</a></p>
    `);
});

// ============ ROTAS ADMIN (PROTEGIDAS POR TOKEN) ============
app.get('/admin', verificarToken, (req, res) => {
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
            .mensagem { padding: 10px; margin: 10px 0; border-radius: 5px; }
            .sucesso { background: #00c853; color: #fff; }
            .erro { background: #e94560; color: #fff; }
            .short-link { color: #f5c842; font-weight: bold; }
        </style>
    </head>
    <body>
        <h1>📊 Painel de Controle</h1>
        <div id="mensagem" style="display:none;" class="mensagem"></div>
        <div class="card">
            <h2>Criar Link</h2>
            <input type="text" id="linkId" placeholder="ID (ex: teste)">
            <input type="text" id="linkDestino" placeholder="Destino (ex: https://google.com)">
            <input type="text" id="linkCanal" placeholder="Canal (opcional)">
            <input type="text" id="linkCampanha" placeholder="Campanha (opcional)">
            <input type="text" id="linkUtm" placeholder="UTM Source (opcional)">
            <button id="btnCriar">🚀 Criar</button>
        </div>
        <div class="card">
            <h2>Links Cadastrados</h2>
            <div id="listaLinks">Carregando...</div>
        </div>

        <script>
            const linkId = document.getElementById('linkId');
            const linkDestino = document.getElementById('linkDestino');
            const linkCanal = document.getElementById('linkCanal');
            const linkCampanha = document.getElementById('linkCampanha');
            const linkUtm = document.getElementById('linkUtm');
            const btnCriar = document.getElementById('btnCriar');
            const listaLinks = document.getElementById('listaLinks');
            const mensagem = document.getElementById('mensagem');

            function mostrarMensagem(texto, tipo) {
                mensagem.textContent = texto;
                mensagem.className = 'mensagem ' + tipo;
                mensagem.style.display = 'block';
                setTimeout(() => {
                    mensagem.style.display = 'none';
                }, 5000);
            }

            async function carregarLinks() {
                try {
                    const response = await fetch('/api/links?token=${TOKEN}&_=' + Date.now());
                    const links = await response.json();
                    
                    let html = '';
                    const ids = Object.keys(links);
                    
                    if (ids.length === 0) {
                        html = '<p style="color: #666;">Nenhum link cadastrado ainda.</p>';
                    } else {
                        html = '<table><tr><th>ID</th><th>Destino</th><th>Cliques</th><th>Ações</th></tr>';
                        for (const id of ids) {
                            const link = links[id];
                            const cliques = link.total_cliques || 0;
                            html += '<tr>' +
                                '<td><strong>' + id + '</strong></td>' +
                                '<td>' + link.destino + '</td>' +
                                '<td>' + cliques + '</td>' +
                                '<td><button class="btn-delete" data-id="' + id + '">🗑️</button></td>' +
                            '</tr>';
                        }
                        html += '</table>';
                    }
                    
                    listaLinks.innerHTML = html;

                    document.querySelectorAll('.btn-delete').forEach(btn => {
                        btn.addEventListener('click', function() {
                            deletarLink(this.getAttribute('data-id'));
                        });
                    });
                } catch (error) {
                    listaLinks.innerHTML = '<p style="color: #e94560;">Erro ao carregar links</p>';
                    console.error('Erro:', error);
                }
            }

            async function criarLink() {
                const id = linkId.value.trim();
                const destino = linkDestino.value.trim();
                const canal = linkCanal.value.trim();
                const campanha = linkCampanha.value.trim();
                const utm_source = linkUtm.value.trim();
                
                if (!id || !destino) {
                    mostrarMensagem('⚠️ Preencha ID e Destino!', 'erro');
                    return;
                }
                
                try {
                    const response = await fetch('/api/links?token=${TOKEN}', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, destino, canal, campanha, utm_source })
                    });
                    
                    if (response.ok) {
                        mostrarMensagem('✅ Link criado com sucesso!', 'sucesso');
                        linkId.value = '';
                        linkDestino.value = '';
                        linkCanal.value = '';
                        linkCampanha.value = '';
                        linkUtm.value = '';
                        carregarLinks();
                    } else {
                        mostrarMensagem('❌ Erro ao criar link', 'erro');
                    }
                } catch (error) {
                    mostrarMensagem('❌ Erro ao criar link', 'erro');
                    console.error('Erro:', error);
                }
            }

            async function deletarLink(id) {
                if (!confirm('Deletar o link "' + id + '"?')) return;
                
                try {
                    const response = await fetch('/api/links/' + id + '?token=${TOKEN}', { 
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        mostrarMensagem('✅ Link deletado!', 'sucesso');
                        carregarLinks();
                    } else {
                        mostrarMensagem('❌ Erro ao deletar link', 'erro');
                    }
                } catch (error) {
                    mostrarMensagem('❌ Erro ao deletar link', 'erro');
                    console.error('Erro:', error);
                }
            }

            btnCriar.addEventListener('click', criarLink);
            carregarLinks();
            setInterval(carregarLinks, 10000);
        </script>
    </body>
    </html>
    `);
});

// ============ API (PROTEGIDA POR TOKEN) ============
app.get('/api/links', verificarToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from('links').select('*');
        if (error) throw error;
        
        const resultado = {};
        data.forEach(link => {
            resultado[link.id] = {
                destino: link.destino,
                canal: link.canal,
                campanha: link.campanha,
                utm_source: link.utm_source,
                total_cliques: link.total_cliques || 0
            };
        });
        res.json(resultado);
    } catch (error) {
        console.error('Erro em /api/links:', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
});

app.post('/api/links', verificarToken, async (req, res) => {
    try {
        const { id, destino, canal, campanha, utm_source } = req.body;
        
        if (!id || !destino) {
            return res.status(400).json({ erro: 'Faltou id ou destino' });
        }
        
        const { error } = await supabase.from('links').upsert({
            id,
            destino,
            canal: canal || 'padrao',
            campanha: campanha || id,
            utm_source: utm_source || 'whatsapp',
            total_cliques: 0
        });
        
        if (error) throw error;
        res.json({ sucesso: true });
    } catch (error) {
        console.error('Erro em /api/links POST:', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
});

app.delete('/api/links/:id', verificarToken, async (req, res) => {
    try {
        const id = req.params.id;
        
        const { error } = await supabase
            .from('links')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        res.json({ sucesso: true });
    } catch (error) {
        console.error('Erro em /api/links DELETE:', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
});

// ============ ROTA DO FUNIL (PÚBLICA) ============
app.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        if (id === 'admin' || id === 'api') {
            return res.status(404).send('Rota não encontrada');
        }

        const { data: link, error } = await supabase
            .from('links')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !link) {
            return res.status(404).send(`
                <h1>🔗 Link não encontrado</h1>
                <p>O link "${id}" não existe.</p>
                <a href="/admin?token=${TOKEN}">Voltar ao painel</a>
            `);
        }

        // ATUALIZA CLIQUE
        await supabase
            .from('links')
            .update({ total_cliques: (link.total_cliques || 0) + 1 })
            .eq('id', id);

        // PÁGINA ISCA (WHITE LABEL)
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
            window.location.href = '${link.destino}?ch=${link.canal || 'padrao'}&campanha=${link.campanha || id}&utm_source=${link.utm_source || 'whatsapp'}';
        }, 1500);
    </script>
</body>
</html>
        `;

        res.send(html);
    } catch (error) {
        console.error('Erro no funil:', error);
        res.status(500).send('Erro interno no servidor');
    }
});

app.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
    console.log('📊 Painel Admin: http://localhost:' + PORT + '/admin?token=' + TOKEN);
});
