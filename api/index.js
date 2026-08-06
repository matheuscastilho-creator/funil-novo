// ============ AUTENTICAÇÃO DO PAINEL ============
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'adhfasjdfas'; // ← MUDE PARA UMA SENHA FORTE

function autenticar(req, res, next) {
    // Pega as credenciais do cabeçalho de autorização
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        // Se não tem credencial, pede login
        res.setHeader('WWW-Authenticate', 'Basic realm="Área Restrita"');
        return res.status(401).send('🔒 Acesso negado. Faça login.');
    }
    
    // Decodifica as credenciais (Basic Auth)
    const base64 = authHeader.split(' ')[1];
    const [user, pass] = Buffer.from(base64, 'base64').toString().split(':');
    
    // Verifica se a senha está correta
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        return next(); // Libera acesso
    }
    
    // Senha errada
    res.setHeader('WWW-Authenticate', 'Basic realm="Área Restrita"');
    return res.status(401).send('🔒 Usuário ou senha incorretos.');
}
