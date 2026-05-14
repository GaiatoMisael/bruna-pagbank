// ══════════════════════════════════════════════════════
// SERVIDOR — BRUNA ADORO FARM × PAGBANK
// ══════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Permite o site chamar este servidor

// ── CONFIGURAÇÃO MERCADO PAGO ─────────────────────────
const MP_TOKEN = process.env.PAGBANK_TOKEN; // reaproveitando a variável
const SITE_URL = process.env.SITE_URL || 'https://gaiatomisael.github.io/bruna-adoro-farm';
const MP_URL   = 'https://api.mercadopago.com';

// ── ROTA: STATUS ──────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: '🌸 Bruna Adoro Farm — Servidor Online!',
    gateway: 'Mercado Pago',
    versao: '2.0.0'
  });
});

// ── ROTA: CRIAR PEDIDO ────────────────────────────────
// O site chama essa rota com os itens do carrinho
// O servidor cria a preferência no Mercado Pago e retorna o link
app.post('/criar-pedido', async (req, res) => {
  try {
    const { itens, cliente } = req.body;

    // Valida os dados recebidos
    if (!itens || !itens.length) {
      return res.status(400).json({ erro: 'Nenhum item no carrinho' });
    }

    // Calcula o total
    const total = itens.reduce((s, i) => s + (i.preco * i.quantidade), 0);

    // Monta o payload para o Mercado Pago
    const payload = {
      items: itens.map(item => ({
        title:       item.nome,
        quantity:    item.quantidade,
        unit_price:  item.preco,
        currency_id: 'BRL',
      })),
      back_urls: {
        success: `${SITE_URL}?pagamento=sucesso`,
        failure: `${SITE_URL}?pagamento=erro`,
        pending: `${SITE_URL}?pagamento=pendente`,
      },
      auto_return:          'approved',
      statement_descriptor: 'ADORO FARM',
      external_reference:   `BRUNA-${Date.now()}`,
    };

    // Chama a API do Mercado Pago — Checkout Pro
    const resposta = await axios.post(
      `${MP_URL}/checkout/preferences`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${MP_TOKEN}`,
          'Content-Type':  'application/json',
        }
      }
    );

    const preferencia = resposta.data;

    // Retorna o link de pagamento para o site
    res.json({
      sucesso: true,
      link:    preferencia.init_point, // link de produção
      id:      preferencia.id,
      total:   total,
    });

  } catch (erro) {
    console.error('Erro Mercado Pago:', erro.response?.data || erro.message);
    res.status(500).json({
      erro:     'Erro ao criar pedido no Mercado Pago',
      detalhes: erro.response?.data || erro.message,
    });
  }
});

// ── ROTA: NOTIFICAÇÃO (Webhook) ───────────────────────
// PagBank chama essa rota quando o pagamento é confirmado
app.post('/notificacao', async (req, res) => {
  try {
    const notif = req.body;
    console.log('📦 Notificação PagBank recebida:', JSON.stringify(notif, null, 2));

    // Aqui você pode:
    // - Enviar email de confirmação
    // - Registrar no banco de dados
    // - Notificar via WhatsApp

    res.sendStatus(200);
  } catch (erro) {
    console.error('Erro na notificação:', erro);
    res.sendStatus(500);
  }
});

// ── ROTA: CONSULTAR PEDIDO ────────────────────────────
app.get('/pedido/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resposta = await axios.get(
      `${PAGBANK_URL}/orders/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${PAGBANK_TOKEN}`,
          'Accept':        'application/json'
        }
      }
    );
    res.json(resposta.data);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao consultar pedido' });
  }
});

// ── INICIA O SERVIDOR ─────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌸 Bruna Adoro Farm — Servidor rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${PAGBANK_ENV}`);
  console.log(`🔗 URL do site: ${SITE_URL}\n`);
});
