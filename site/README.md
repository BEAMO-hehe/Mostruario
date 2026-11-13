# ⭐ STARGIRL - Moda Anos 2000s

Front-end completo desenvolvido em HTML5, CSS3 e JavaScript puro (ES6+), inspirado na moda retrô anos 2000s com tema de estrelas e paleta de tons pastéis (azul bebê, verde menta e rosa).

> **100% Integrado à API REST:** Sem dados mockados, todas as informações são consultadas dinamicamente do backend Node.js/Express e banco MySQL (`http://localhost:3333/api`).

---

## 📁 Estrutura de Arquivos na Pasta `site/`

```
site/
├── index.html            # Loja virtual completa (Hero Estrela, Divisória Inverno/Verão, Vitrines, Modais e Carrinho)
├── style.css             # Estilização pastel Y2K limpa e responsiva
├── main.js               # Lógica da loja, filtros dinâmicos e checkout WhatsApp
├── README.md             # Documentação
└── admin/                # Painel Administrativo
    ├── index.html        # Roteador de autenticação
    ├── login.html        # Login autenticado via POST /api/usuarios/login
    ├── dashboard.html    # Dashboard com layout Grid 1fr / 4fr (Produtos, Categorias, Lojas, Pedidos)
    ├── style.css         # Estilo do painel admin
    └── admin.js          # CRUD dinâmico e sincronia com a API
```

---

## ⭐ Funcionalidades Principais

1. **Identidade Visual Star & Anos 2000s**
   - Nome: **STARGIRL**
   - Ícone e insígnias em formato de estrela (⭐), gradientes candy em rosa bebê, azul céu e verde menta.
   - Interface limpa e direta, sem poluição de informações.

2. **Divisória Sazonal Objetiva**
   - ❄️ **Coleção Inverno:** Casacos puffer, moletons e botas.
   - ☀️ **Coleção Verão:** Baby tees, saias e sandálias.

3. **Filtros Server-Side Dinâmicos**
   - Busca por texto, select de categorias do banco, seletor de estação e faixa de preço disparando `GET /api/produtos/loja/:id`.

4. **Navegação Horizontal com Setas Suaves**
   - Vitrines organizadas por categoria com setas de scroll suave lateral.

5. **Modal de Detalhes em 2 Colunas & Sacola de Compras**
   - Imagem 100% na coluna esquerda, detalhes na direita.
   - Drawer de sacola com persistência no `localStorage`.

6. **WhatsApp Oficial:** `(00) 99618-7306`
   - Formatação estruturada automática para envio de pedidos direto no WhatsApp.

7. **Painel Admin Integrado (`site/admin/`)**
   - Autenticação real contra `POST /api/usuarios/login`.
   - Grid 1fr / 4fr com módulos de Produtos, Categorias, Lojas e Pedidos.
