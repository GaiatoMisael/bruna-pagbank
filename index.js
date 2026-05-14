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

// ── CONFIGURAÇÃO PAGBANK ──────────────────────────────
const PAGBANK_ENV = process.env.PAGBANK_ENV || 'production';
const PAGBANK_URL = PAGBANK_ENV === 'sandbox'
  ? 'https://sandbox.api.pagseguro.com'
  : 'https://api.pagseguro.com';

const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;
const SITE_URL      = process.env.SITE_URL || 'https://brunaadorofarm.netlify.app';

// ── ROTA: STATUS ──────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: '🌸 Bruna Adoro Farm — Servidor Online!',
    ambiente: PAGBANK_ENV,
    versao: '1.0.0'
  });
});

// ── ROTA: CRIAR PEDIDO ────────────────────────────────
// O site chama essa rota com os itens do carrinho
// O servidor cria o pedido no PagBank e retorna o link
app.post('/criar-pedido', async (req, res) => {
  try {
    const { itens, cliente } = req.body;

    // Valida os dados recebidos
    if (!itens || !itens.length) {
      return res.status(400).json({ erro: 'Nenhum item no carrinho' });
    }

    // Calcula o total
    const total = itens.reduce((s, i) => s + (i.preco * i.quantidade), 0);

    // Monta o payload para o PagBank
    const payload = {
      reference_id: `BRUNA-${Date.now()}`,
      customer: {
        name:  cliente?.nome  || 'Cliente Bruna Adoro Farm',
        email: cliente?.email || 'cliente@brunaadorofarm.com',
        tax_id: cliente?.cpf?.replace(/\D/g, '') || '00000000000',
        phones: [{
          country: '55',
          area:    cliente?.telefone?.slice(0,2)  || '21',
          number:  cliente?.telefone?.slice(2)    || '999999999',
          type:    'MOBILE'
        }]
      },
      items: itens.map((item, idx) => ({
        reference_id: String(idx + 1),
        name:         item.nome.substring(0, 64),
        quantity:     item.quantidade,
        unit_amount:  Math.round(item.preco * 100) // PagBank usa centavos
      })),
      shipping: {
        address: {
          street:      'A combinar',
          number:      '0',
          complement:  '',
          locality:    'Rio de Janeiro',
          city:        'Rio de Janeiro',
          region_code: 'RJ',
          country:     'BRA',
          postal_code: '20000000'
        }
      },
      notification_urls: [`${process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://'+process.env.RAILWAY_PUBLIC_DOMAIN : 'http://localhost:3000'}/notificacao`],
      charges: [{
        reference_id:    `CHARGE-${Date.now()}`,
        description:     'Compra — Bruna Adoro Farm',
        amount: {
          value:    Math.round(total * 100),
          currency: 'BRL'
        },
        payment_method: {
          type:         'CREDIT_CARD',
          installments: 1,
          capture:      true
        }
      }],
      redirect_url: `${SITE_URL}?pagamento=sucesso`,
      return_url:   `${SITE_URL}?pagamento=sucesso`,
    };

    // Chama a API do PagBank — Checkout
    const resposta = await axios.post(
      `${PAGBANK_URL}/checkouts`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${PAGBANK_TOKEN}`,
          'Content-Type':  'application/json',
          'Accept':        'application/json'
        }
      }
    );

    const checkout = resposta.data;

    // Retorna o link de pagamento para o site
    res.json({
      sucesso:    true,
      checkout_id: checkout.id,
      link:       checkout.links?.find(l => l.rel === 'PAY')?.href || checkout.links?.[0]?.href,
      referencia: payload.reference_id,
      total:      total
    });

  } catch (erro) {
    console.error('Erro PagBank:', erro.response?.data || erro.message);
    res.status(500).json({
      erro:      'Erro ao criar pedido no PagBank',
      detalhes:  erro.response?.data || erro.message
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
