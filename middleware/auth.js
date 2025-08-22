// middleware/auth.js
const jwt = require('jsonwebtoken')
const EDITOR_JWT_SECRET = process.env.EDITOR_JWT_SECRET

const verifyToken = (req, res, next) => {
  const token = req.query.token

  if (!token) {
    return res.status(401).send('<h1>Acesso Negado</h1><p>Token de autenticação não fornecido.</p>')
  }

  if (!EDITOR_JWT_SECRET) {
    return res
      .status(500)
      .send('<h1>Erro no Servidor</h1><p>A chave de segurança não está configurada.</p>')
  }

  try {
    const decoded = jwt.verify(token, EDITOR_JWT_SECRET)
    if (decoded.role !== 'vendedor') {
      return res
        .status(403)
        .send('<h1>Acesso Negado</h1><p>Você não tem permissão para acessar este recurso.</p>')
    }
    req.user = decoded
    next() // Tudo certo, pode ir para a próxima etapa (servir a página)
  } catch (ex) {
    res
      .status(400)
      .send(
        '<h1>Acesso Negado</h1><p>Seu link de acesso é inválido ou expirou. Por favor, gere um novo link no sistema principal.</p>',
      )
  }
}

module.exports = verifyToken
