# Kauan Store: configuração do Supabase (passo a passo)

Projeto: `jzqblwpfrairintgdxhr` (https://jzqblwpfrairintgdxhr.supabase.co)

## 1. Banco de dados
1. Abra **SQL Editor** e cole o arquivo `supabase/migrations/001_kauan_store.sql`. Clique em **Run**.
   - Cria/ajusta `profiles`, `user_orders`, `user_favorites`, `wallet_transactions`, `coupons`, `nfa_tiers`, `store_owners`.
   - Liga a segurança por usuário (RLS): cada cliente só vê os próprios dados. O navegador **não** consegue gravar pedidos nem saldo.
   - Cria o cupom `LANCAMENTO20` (20%) e as faixas NFA (1-10 ... 200+), com preço e estoque vazios para você preencher na tabela `nfa_tiers`.
2. Se suas tabelas já tinham outras colunas, o script só **acrescenta** as que faltam (não apaga nada). Confira os nomes antes de rodar.
3. Para virar dono da loja (libera "Gerenciar cupons"), rode uma vez com o seu e-mail:
   `insert into public.store_owners (email) values ('seu-email@exemplo.com') on conflict do nothing;`

## 2. Login (Google e Discord)
1. **Authentication > Providers**: ligue **Google** e **Discord** e cole o Client ID e o Client Secret de cada um.
2. No Google Cloud e no Discord Developer Portal, cadastre este endereço de retorno (callback):
   `https://jzqblwpfrairintgdxhr.supabase.co/auth/v1/callback`
3. **Authentication > URL Configuration**: em *Site URL* coloque o endereço do seu site no Netlify e, em *Redirect URLs*, adicione o mesmo endereço (e `http://localhost:5173` para testar).

## 3. Edge Functions (editor web do painel)
Crie estas 6 funções com os nomes exatos e cole o `index.ts` de cada pasta em `supabase/functions/`:
`catalog`, `account-details`, `create-checkout`, `check-order`, `read-mailbox`, `create-deposit`.
- Desligue **Verify JWT** em todas (as que precisam de login conferem o token por dentro).
- Secrets: `LEGAS_API_KEY` e `LEGAS_MARGIN_PERCENT` (já existem). Opcional: `STEAM_MARGIN_PERCENT` (padrão 70).
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são fornecidas automaticamente às funções.
- Se uma função acusar erro ao publicar por causa do `import { createClient } from 'npm:@supabase/supabase-js@2'`, confirme que a linha está no topo do arquivo, sem nada antes.

## 4. Site (Netlify)
Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (chave **anon**), `VITE_STORE_NAME`, `VITE_INSTAGRAM_URL`, `VITE_DISCORD_URL`, `VITE_TERMS_URL` (opcional).

## O que ainda depende de você
- **Depósito na carteira por PIX:** a Legas Forn só abre cobrança de compra de conta. Para depósito é preciso ligar um provedor de PIX (Mercado Pago, Asaas, EFI...) em `create-deposit` e gravar o saldo pelo webhook. Hoje a função valida o mínimo de R$ 5,00 e responde que o depósito não está ativo.
- **Caixa de e-mail:** a leitura usa IMAP com a senha entregue no pedido. Outlook/Hotmail bloqueiam esse acesso em muitas contas; nesse caso o cliente vê o aviso e pode abrir o site do e-mail.
- **Cupons:** o cliente valida e salva o cupom na conta. O desconto ainda não é aplicado automaticamente no PIX da Legas Forn.
