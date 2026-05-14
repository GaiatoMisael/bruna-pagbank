require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MP_TOKEN = process.env.PAGBANK_TOKEN;
const SITE_URL = process.env.SITE_URL || 'https://gaiatomisael.github.io/bruna-adoro-farm';
const MP_URL   = 'https://api.mercadopago.com';

app.get('/', (req, res) => {
  res.json({ status: '🌸 Bruna Adoro Farm Online!', gateway: 'Mercado Pago', versao: '2.0.0' });
});

app.post('/criar-pedido', async (req, res) => {
  try {
    const { itens } = req.body;
    if (!itens || !itens.length) return res.status(400).json({ erro: 'Carrinho vazio' });
    const resposta = await axios.post(`${MP_URL}/checkout/preferences`, {
      items: itens.map(i => ({ title: i.nome, quantity: i.quantidade, unit_price: i.preco, currency_id: 'BRL' })),
      back_urls: { success: SITE_URL, failure: SITE_URL, pending: SITE_URL },
      auto_return: 'approved',
      statement_descriptor: 'ADORO FARM',
    }, { headers: { 'Authorization': `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' } });
    res.json({ sucesso: true, link: resposta.data.init_point });
  } catch (erro) {
    console.error('Erro MP:', erro.response?.data || erro.message);
    res.status(500).json({ erro: 'Erro ao criar pedido', detalhes: erro.response?.data || erro.message });
  }
});

app.post('/notificacao', (req, res) => { console.log('Notificação MP:', req.body); res.sendStatus(200); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌸 Servidor rodando na porta ${PORT}`));
