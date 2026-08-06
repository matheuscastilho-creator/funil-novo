const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============ CONFIGURAÇÕES ============
// SUPABASE
const SUPABASE_URL = 'https://ucodtkzqxcxytopllmau.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iMkFeVPo1eIc0qa3ZL1erg_ce_r0_tM';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// SHORT.IO
const SHORTIO_API_KEY = 'sk_zwDYrsMA7LqU7uQp';
const SHORTIO_DOMAIN = 'ahrcgi.short.gy';  // ← SEU DOMÍNIO

// ============ FUNÇÃO CRIAR LINK SHORT.IO ============
async function criarLinkShortIO(linkId) {
    try {
        const originalURL = `https://funil-novo-pied.vercel.app/${linkId}`;
        
        const response = await fetch('https://api.short.io/links', {
            method: 'POST',
            headers: {
                'Authorization': SHORTIO_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                domain: SHORTIO_DOMAIN,
                originalURL: originalURL,
                path: linkId,
                redirectType: 302,
                title: 'Oferta Especial',
                description: 'Clique e confira sua oferta exclusiva'
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Erro no Short.io');
        
        console.log('🔗 Short.io link criado:', data.shortURL);
        return {
            shortUrl: data.shortURL,
            id: data.idString
        };
    } catch (error) {
        console.error('Erro no Short.io:', error);
        return null;
    }
}

// ============ FUNÇÃO DELETAR LINK SHORT.IO ============
async function deletarLinkShortIO(shortioId) {
    try {
        const response = await fetch(`https://api.short.io/links/${shortioId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': SHORTIO_API_KEY
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Erro ao deletar no Short.io:', error);
        return false;
    }
}

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
        a { color: #64b5f6; text-decoration: none; }
        a:hover { text-decoration: underline; }
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
        <button id="btnCriar">🚀 Criar + Short.io</button>
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
                const response = await fetch('/api/links?_=' + Date.now());
                const links = await response.json();
                
                let html = '';
                const ids = Object.keys(links);
                
                if (ids.length === 0) {
                    html = '<p style="color: #666;">Nenhum link cadastrado ainda.</p>';
                } else {
                    html = '<table><tr><th>ID</th><th>Destino</th><th>Short.io</th><th>Cliques</th><th>Ações</th></tr>';
                    for (const id of ids) {
                        const link = links[id];
                        const shortUrl = link.short_url || 'Não gerado';
                        const cliques = link.total_cliques || 0;
                        html += '<tr>' +
                            '<td><strong>' + id + '</strong></td>' +
                            '<td>' + link.destino + '</td>' +
                            '<td><a href="' + shortUrl + '" target="_blank" class="short-link">' + shortUrl + '</a></td>' +
                            '<td>' + cliques + '</td>' +
                            '<td><button class="btn-delete" data-id="' + id + '" data-shortio="' + (link.shortio_id || '') + '">🗑️</button></td>' +
                        '</tr>';
                    }
                    html += '</table>';
                }
                
                listaLinks.innerHTML = html;

                document.querySelectorAll('.btn-delete').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const id = this.getAttribute('data-id');
                        const shortioId = this.getAttribute('data-shortio');
                        deletarLink(id, shortioId);
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
                const response = await fetch('/api/links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, destino, canal, campanha, utm_source })
                });
                
                const data = await response.json();
                
                if (response.ok && data.sucesso) {
                    mostrarMensagem('✅ Link criado com sucesso! Short.io: ' + data.short_url, 'sucesso');
                    linkId.value = '';
                    linkDestino.value = '';
                    linkCanal.value = '';
                    linkCampanha.value = '';
                    linkUtm.value = '';
                    carregarLinks();
                } else {
                    mostrarMensagem('❌ Erro ao criar link: ' + (data.erro || ''), 'erro');
                }
            } catch (error) {
                mostrarMensagem('❌ Erro ao criar link', 'erro');
                console.error('Erro:', error);
            }
        }

        async function deletarLink(id, shortioId) {
            if (!confirm('Deletar o link "' + id + '"?')) return;
            
            try {
                const response = await fetch('/api/links/' + id, { 
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shortioId })
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

// ============ API ============
app.get('/api/links', async (req, res) => {
    try {
        const { data: links, error } = await supabase
            .from('links')
            .select('*');
        
        if (error) throw error;
        
        const resultado = {};
        links.forEach(link => {
            resultado[link.id] = {
                destino: link.destino,
                canal: link.canal,
                campanha: link.campanha,
                utm_source: link.utm_source,
                short_url: link.short_url,
                shortio_id: link.shortio_id,
                total_cliques: link.total_cliques || 0
            };
        });
        
        res.json(resultado);
    } catch (error) {
        console.error('Erro em /api/links:', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
});

app.post('/api/links', async (req, res) => {
    try {
        const { id, destino, canal, campanha, utm_source } = req.body;
        
        if (!id || !destino) {
            return res.status(400).json({ erro: 'Faltou id ou destino' });
        }
        
        // 1. CRIA LINK NO SHORT.IO
        const shortioResult = await criarLinkShortIO(id);
        
        if (!shortioResult) {
            return res.status(500).json({ erro: 'Erro ao criar link no Short.io' });
        }
        
        // 2. SALVA NO SUPABASE
        const { error } = await supabase
            .from('links')
            .upsert({
                id,
                destino,
                canal: canal || 'padrao',
                campanha: campanha || id,
                utm_source: utm_source || 'whatsapp',
                short_url: shortioResult.shortUrl,
                shortio_id: shortioResult.id,
                total_cliques: 0
            });
        
        if (error) throw error;
        
        res.json({ 
            sucesso: true, 
            short_url: shortioResult.shortUrl,
            id: shortioResult.id
        });
    } catch (error) {
        console.error('Erro em /api/links POST:', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
});

app.delete('/api/links/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { shortioId } = req.body;
        
        // 1. DELETA DO SHORT.IO
        if (shortioId) {
            await deletarLinkShortIO(shortioId);
        }
        
        // 2. DELETA DO SUPABASE
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

// ============ FUNIL ============
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
                <a href="/admin">Voltar ao painel</a>
            `);
        }

        // ATUALIZA CLIQUE NO SUPABASE
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

// ============ ROTA RAIZ ============
app.get('/', (req, res) => {
    res.send(`
        <h1>🚀 Funil funcionando!</h1>
        <p><a href="/admin">📊 Acessar Painel Administrativo</a></p>
    `);
});

app.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
    console.log('📊 Painel Admin: http://localhost:' + PORT + '/admin');
    console.log('🔗 Short.io configurado com domínio: ahrcgi.short.gy');
});
