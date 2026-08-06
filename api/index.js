const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============ AUTENTICAÇÃO ============
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123'; // ← MUDE DEPOIS

function autenticar(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
        return res.status(401).send('Login necessario');
    }
    const base64 = auth.split(' ')[1];
    const [user, pass] = Buffer.from(base64, 'base64').toString().split(':');
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).send('Senha incorreta');
}

// ============ CONFIGURAÇÕES ============
const supabase = createClient(
    'https://ucodtkzqxcxytopllmau.supabase.co',
    'sb_publishable_iMkFeVPo1eIc0qa3ZL1erg_ce_r0_tM'
);

// ============ ROTAS PÚBLICAS ============
app.get('/', (req, res) => {
    res.send('🚀 Funil funcionando! <a href="/admin">Admin</a>');
});

// ============ ROTAS PROTEGIDAS ============
app.get('/admin', autenticar, (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Painel</title>
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
    </style>
    </head>
    <body>
        <h1>📊 Painel</h1>
        <div class="card">
            <h2>Criar Link</h2>
            <input type="text" id="id" placeholder="ID">
            <input type="text" id="destino" placeholder="Destino">
            <input type="text" id="canal" placeholder="Canal">
            <input type="text" id="campanha" placeholder="Campanha">
            <input type="text" id="utm" placeholder="UTM">
            <button onclick="criar()">Criar</button>
        </div>
        <div class="card">
            <h2>Links</h2>
            <div id="lista"></div>
        </div>
        <script>
            async function carregar() {
                const r = await fetch('/api/links');
                const links = await r.json();
                let html = '<table><tr><th>ID</th><th>Destino</th><th>Cliques</th><th>Ações</th></tr>';
                for (const [id, link] of Object.entries(links)) {
                    html += \`<tr><td>\${id}</td><td>\${link.destino}</td><td>\${link.total_cliques||0}</td><td><button onclick="deletar('\${id}')">🗑️</button></td></tr>\`;
                }
                html += '</table>';
                document.getElementById('lista').innerHTML = html;
            }
            async function criar() {
                const id = document.getElementById('id').value;
                const destino = document.getElementById('destino').value;
                const canal = document.getElementById('canal').value;
                const campanha = document.getElementById('campanha').value;
                const utm = document.getElementById('utm').value;
                await fetch('/api/links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, destino, canal, campanha, utm_source:utm })
                });
                carregar();
            }
            async function deletar(id) {
                if (!confirm('Deletar?')) return;
                await fetch('/api/links/'+id, { method: 'DELETE' });
                carregar();
            }
            carregar();
        </script>
    </body>
    </html>
    `);
});

app.get('/api/links', autenticar, async (req, res) => {
    try {
        const { data } = await supabase.from('links').select('*');
        const result = {};
        data.forEach(item => {
            result[item.id] = {
                destino: item.destino,
                canal: item.canal,
                campanha: item.campanha,
                utm_source: item.utm_source,
                total_cliques: item.total_cliques || 0
            };
        });
        res.json(result);
    } catch (e) {
        res.status(500).json({ erro: 'Erro' });
    }
});

app.post('/api/links', autenticar, async (req, res) => {
    try {
        const { id, destino, canal, campanha, utm_source } = req.body;
        if (!id || !destino) return res.status(400).json({ erro: 'Faltou id ou destino' });
        
        await supabase.from('links').upsert({
            id,
            destino,
            canal: canal || 'padrao',
            campanha: campanha || id,
            utm_source: utm_source || 'whatsapp',
            total_cliques: 0
        });
        res.json({ sucesso: true });
    } catch (e) {
        res.status(500).json({ erro: 'Erro' });
    }
});

app.delete('/api/links/:id', autenticar, async (req, res) => {
    try {
        await supabase.from('links').delete().eq('id', req.params.id);
        res.json({ sucesso: true });
    } catch (e) {
        res.status(500).json({ erro: 'Erro' });
    }
});

// ============ ROTA DO FUNIL ============
app.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        if (id === 'admin' || id === 'api') {
            return res.status(404).send('Rota não encontrada');
        }
        
        const { data: link } = await supabase
            .from('links')
            .select('*')
            .eq('id', id)
            .single();
            
        if (!link) {
            return res.status(404).send('<h1>Link não encontrado</h1>');
        }
        
        // Atualiza clique
        await supabase
            .from('links')
            .update({ total_cliques: (link.total_cliques || 0) + 1 })
            .eq('id', id);
        
        // Página isca
        res.send(`
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
            </div>
            <script>
                setTimeout(function() {
                    window.location.href = '${link.destino}?ch=${link.canal}&campanha=${link.campanha}&utm_source=${link.utm_source}';
                }, 1500);
            </script>
        </body>
        </html>
        `);
    } catch (e) {
        res.status(500).send('Erro interno');
    }
});

app.listen(PORT, () => {
    console.log('🚀 Rodando na porta', PORT);
});
