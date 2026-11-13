/**
 * ==========================================================================
 * Y2K PASTEL BOUTIQUE - MAIN.JS
 * Front-end 100% Vanilla JS (ES6+)
 * 100% Integrado à API REST (Sem Mocks)
 * Backend: Express + MySQL | WhatsApp: 996187306
 * ==========================================================================
 */

// Determina a URL base da API dinamicamente (Compatível com Localhost e Vercel)
const getApiBaseUrl = () => {
  if (window.location.port === '5500' || window.location.port === '5501') {
    return 'http://localhost:3333/api';
  }
  return '/api';
};

// Configurações Globais da API
const CONFIG = {
  API_BASE_URL: getApiBaseUrl(),
  STORE_ID: 1, // Loja ativa consultada via /api/lojas
  WHATSAPP_NUMBER: '55996187306',
  CART_STORAGE_KEY: 'y2k_boutique_cart_v1',
  ORDERS_STORAGE_KEY: 'y2k_whatsapp_orders'
};

// Estado da Aplicação
const state = {
  products: [],
  categories: [],
  filters: {
    texto: '',
    categoria: '',
    season: 'todas',
    precoMin: '',
    precoMax: ''
  },
  cart: [],
  activeModalProduct: null
};

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initCart();
  setupEventListeners();
  await initStoreAndCategories();
  await fetchProducts();
});

// ==========================================================================
// DESCOBERTA DA LOJA ATIVA E CARREGAMENTO DE CATEGORIAS DA API
// ==========================================================================
async function initStoreAndCategories() {
  // 1. Busca lojas cadastradas na API
  try {
    const resLojas = await fetch(`${CONFIG.API_BASE_URL}/lojas`);
    if (resLojas.ok) {
      const dataLojas = await resLojas.json();
      if (dataLojas.lojas && dataLojas.lojas.length > 0) {
        CONFIG.STORE_ID = dataLojas.lojas[0].id;
      }
    }
  } catch (err) {
    console.error('Erro ao conectar com /api/lojas:', err);
  }

  // 2. Busca categorias reais cadastradas no banco via API
  const select = document.getElementById('filterCategory');
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/categorias`);
    if (res.ok) {
      const data = await res.json();
      state.categories = data.categorias || [];
      
      if (select) {
        select.innerHTML = '<option value="">Todas as Categorias</option>';
        state.categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.nome;
          opt.textContent = cat.nome;
          select.appendChild(opt);
        });
      }
    } else {
      console.error('Falha ao carregar categorias da API:', res.statusText);
    }
  } catch (err) {
    console.error('Erro de conexão com /api/categorias:', err);
  }
}

// ==========================================================================
// BUSCA SERVER-SIDE DOS PRODUTOS VIA API COM FILTROS (PROMPT MESTRE)
// ==========================================================================
let filterDebounceTimer = null;

async function fetchProducts() {
  const container = document.getElementById('categoriesContainer');
  const resultsCount = document.getElementById('resultsCount');

  // Constrói Query String para o endpoint /api/produtos/loja/:id
  const params = new URLSearchParams();
  if (state.filters.texto) params.append('texto', state.filters.texto);
  if (state.filters.categoria) params.append('categoria', state.filters.categoria);
  if (state.filters.precoMin) params.append('precoMin', state.filters.precoMin);
  if (state.filters.precoMax) params.append('precoMax', state.filters.precoMax);

  // Exibe estado de carregamento
  if (container) {
    container.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner"></i>
        <span>Consultando catálogo na API (http://localhost:3333)...</span>
      </div>
    `;
  }

  try {
    const url = `${CONFIG.API_BASE_URL}/produtos/loja/${CONFIG.STORE_ID}?${params.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.mensagem || `Erro ${res.status}: Não foi possível obter os produtos.`);
    }

    const data = await res.json();
    let loadedProducts = data.produtos || [];

    // Filtro adicional de estação (Inverno / Verão) solicitado
    if (state.filters.season && state.filters.season !== 'todas') {
      loadedProducts = loadedProducts.filter(p => {
        const catName = (p.nome_categoria || '').toLowerCase();
        const pName = (p.nome || '').toLowerCase();
        const pDesc = (p.descricao || '').toLowerCase();

        if (state.filters.season === 'inverno') {
          return catName.includes('inverno') || pName.includes('inverno') || pName.includes('jaqueta') || pName.includes('moletom') || pName.includes('casaco') || pName.includes('puffer') || pName.includes('bota') || pDesc.includes('inverno');
        } else if (state.filters.season === 'verao') {
          return catName.includes('verão') || catName.includes('verao') || pName.includes('verão') || pName.includes('verao') || pName.includes('baby tee') || pName.includes('saia') || pName.includes('biquíni') || pName.includes('top') || pName.includes('tamanco') || pDesc.includes('verão');
        }
        return true;
      });
    }

    state.products = loadedProducts;
    renderCategoriesGrid(state.products);
    updateActiveChips();

    if (resultsCount) {
      resultsCount.innerHTML = `Mostrando <strong>${state.products.length}</strong> produtos retornados pela API`;
    }

  } catch (err) {
    console.error('Erro na requisição à API de produtos:', err);
    state.products = [];
    if (resultsCount) resultsCount.textContent = 'Erro ao consultar a API';
    
    if (container) {
      container.innerHTML = `
        <div class="cart-empty-state" style="padding: 60px 20px;">
          <i class="fas fa-triangle-exclamation" style="font-size: 3rem; color: #FF6B8B;"></i>
          <h3 style="font-family: var(--font-heading); margin-top: 14px;">Não foi possível carregar os produtos da API</h3>
          <p style="color: var(--text-muted); margin-top: 6px; max-width: 500px; margin-left: auto; margin-right: auto;">
            Certifique-se de que o backend está em execução e o banco Supabase está configurado com as variáveis de ambiente.
          </p>
          <p style="font-size: 0.8rem; color: #8A7D92; margin-top: 6px;">
            Endpoint: <code>GET ${CONFIG.API_BASE_URL}/produtos/loja/${CONFIG.STORE_ID}</code>
          </p>
          <button onclick="fetchProducts()" class="btn-filter-clear" style="margin: 18px auto 0; display: inline-flex;">
            <i class="fas fa-rotate"></i> Tentar Novamente
          </button>
        </div>
      `;
    }
  }
}

// ==========================================================================
// RENDERIZAÇÃO HORIZONTAL POR CATEGORIA COM SCROLL SUAVE (PROMPT MESTRE)
// ==========================================================================
function renderCategoriesGrid(products) {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state" style="padding: 60px 20px;">
        <i class="fas fa-box-open" style="font-size: 3rem; color: var(--pastel-pink-dark);"></i>
        <h3 style="font-family: var(--font-heading); margin-top: 14px;">Nenhum produto cadastrado no banco de dados</h3>
        <p style="color: var(--text-muted); margin-top: 6px;">Não foram encontrados registros para os filtros selecionados ou para a loja ativa.</p>
        <button onclick="clearAllFilters()" class="btn-filter-clear" style="margin: 16px auto 0; display: inline-flex;">
          <i class="fas fa-rotate-left"></i> Limpar Filtros
        </button>
      </div>
    `;
    return;
  }

  // Agrupa os produtos retornados da API pela coluna `nome_categoria`
  const grouped = {};
  products.forEach(prod => {
    const cat = prod.nome_categoria || 'Produtos em Destaque';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(prod);
  });

  const categoryIcons = {
    'Roupas de Inverno': '❄️',
    'Roupas de Verão': '☀️',
    'Calçados': '👠',
    'Enfeites de Cabelo': '🦋',
    'Acessórios': '✨'
  };

  let html = '';

  Object.keys(grouped).forEach((catName, index) => {
    const list = grouped[catName];
    const icon = categoryIcons[catName] || '💖';
    const rowId = `track-cat-${index}`;

    html += `
      <section class="category-row-section">
        <div class="category-row-header">
          <div class="category-title-group">
            <div class="category-icon-pill">${icon}</div>
            <h3 class="category-title">${catName}</h3>
            <span class="category-count">${list.length} ${list.length === 1 ? 'item' : 'itens'}</span>
          </div>

          <!-- Setas de Scroll Suave -->
          <div class="category-controls">
            <button class="btn-scroll-arrow btn-prev" data-target="${rowId}" aria-label="Voltar no carrossel">
              <i class="fas fa-chevron-left"></i>
            </button>
            <button class="btn-scroll-arrow btn-next" data-target="${rowId}" aria-label="Avançar no carrossel">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- Grid Horizontal com Scroll Suave & Snap -->
        <div class="horizontal-products-track" id="${rowId}">
          ${list.map(p => createProductCardHtml(p)).join('')}
        </div>
      </section>
    `;
  });

  container.innerHTML = html;

  // Ouvintes para os botões de setas de scroll suave
  container.querySelectorAll('.btn-scroll-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const track = document.getElementById(targetId);
      if (!track) return;
      const isNext = btn.classList.contains('btn-next');
      const scrollAmount = 320;
      track.scrollBy({
        left: isNext ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    });
  });

  // Ouvintes de clique nos cards (abre modal) e no botão de adição rápida
  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-quick-add')) return;
      const productId = parseInt(card.getAttribute('data-id'), 10);
      const product = state.products.find(p => p.id === productId);
      if (product) openProductModal(product);
    });
  });

  container.querySelectorAll('.btn-quick-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = parseInt(btn.getAttribute('data-id'), 10);
      const product = state.products.find(p => p.id === productId);
      if (product) {
        addToCart(product, 1);
        showToast(`✨ "${product.nome}" adicionado à sacola!`);
      }
    });
  });
}

// Template HTML do Card de Produto
function createProductCardHtml(p) {
  const formattedPrice = formatCurrency(p.preco);
  const catLower = (p.nome_categoria || '').toLowerCase();
  const isWinter = catLower.includes('inverno');
  const isSummer = catLower.includes('verão') || catLower.includes('verao');

  const badgeClass = isWinter ? 'inverno' : (isSummer ? 'verao' : 'geral');
  const badgeText = isWinter ? '❄️ Inverno' : (isSummer ? '☀️ Verão' : '✨ Y2K');
  const imgUrl = p.imagem_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=80';

  return `
    <article class="product-card" data-id="${p.id}">
      <span class="product-card-badge ${badgeClass}">${badgeText}</span>
      
      <div class="product-img-wrapper">
        <img src="${imgUrl}" alt="${p.nome}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80'">
        <button type="button" class="btn-quick-add" data-id="${p.id}" title="Adicionar rapidamente à sacola">
          <i class="fas fa-plus"></i>
        </button>
      </div>

      <div class="product-info">
        <span class="product-category-name">${p.nome_categoria || 'Y2K Vintage'}</span>
        <h4 class="product-name truncate" title="${p.nome}">${p.nome}</h4>
        <p class="product-desc truncate-2-lines" title="${p.descricao || ''}">${p.descricao || 'Peça autêntica no estilo vintage anos 2000.'}</p>
        
        <div class="product-footer">
          <span class="product-price">${formattedPrice}</span>
          <span class="product-stock-tag ${p.quantidade < 5 ? 'low' : ''}">
            ${p.quantidade > 0 ? `${p.quantidade} un` : 'Esgotado'}
          </span>
        </div>
      </div>
    </article>
  `;
}

// ==========================================================================
// MODAL DE DETALHES DO PRODUTO (GRID DE 2 COLUNAS CONFORME PROMPT MESTRE)
// ==========================================================================
function openProductModal(product) {
  state.activeModalProduct = product;

  const modal = document.getElementById('productModal');
  const img = document.getElementById('modalProductImg');
  const catBadge = document.getElementById('modalCategoryBadge');
  const title = document.getElementById('modalProductTitle');
  const price = document.getElementById('modalProductPrice');
  const desc = document.getElementById('modalProductDesc');
  const stock = document.getElementById('modalStockTag');
  const qtyInput = document.getElementById('modalQtyInput');

  img.src = product.imagem_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80';
  img.alt = product.nome;

  catBadge.textContent = product.nome_categoria || 'Y2K Vintage';
  title.textContent = product.nome;
  price.textContent = formatCurrency(product.preco);
  desc.textContent = product.descricao || 'Sem descrição cadastrada no banco de dados.';
  stock.textContent = product.quantidade > 0 ? `${product.quantidade} em estoque` : 'Esgotado';
  qtyInput.value = 1;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ==========================================================================
// CARRINHO DE COMPRAS (LOCALSTORAGE)
// ==========================================================================
function initCart() {
  try {
    const saved = localStorage.getItem(CONFIG.CART_STORAGE_KEY);
    if (saved) {
      state.cart = JSON.parse(saved);
    }
  } catch (e) {
    state.cart = [];
  }
  updateCartUI();
}

function saveCart() {
  try {
    localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(state.cart));
  } catch (e) {}
  updateCartUI();
}

function addToCart(product, quantity = 1) {
  const existing = state.cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    state.cart.push({
      id: product.id,
      nome: product.nome,
      preco: Number(product.preco),
      imagem_url: product.imagem_url,
      nome_categoria: product.nome_categoria,
      quantity: quantity
    });
  }
  saveCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.id !== productId);
  saveCart();
}

function updateCartQuantity(productId, delta) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
  } else {
    saveCart();
  }
}

function updateCartUI() {
  const badge = document.getElementById('cartBadgeCount');
  const list = document.getElementById('cartItemsList');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');

  const totalItems = state.cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = state.cart.reduce((acc, item) => acc + (item.preco * item.quantity), 0);

  if (badge) badge.textContent = totalItems;
  if (subtotalEl) subtotalEl.textContent = formatCurrency(totalPrice);
  if (totalEl) totalEl.textContent = formatCurrency(totalPrice);

  if (!list) return;

  if (state.cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty-state">
        <i class="fas fa-bag-shopping"></i>
        <h4>Sua sacola está vazia</h4>
        <p>Adicione peças vintage do catálogo para finalizar seu look!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = state.cart.map(item => `
    <div class="cart-item-card">
      <img src="${item.imagem_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200&auto=format&fit=crop&q=80'}" alt="${item.nome}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-name truncate" title="${item.nome}">${item.nome}</div>
        <div class="cart-item-price">${formatCurrency(item.preco)}</div>
        <div class="cart-item-controls">
          <button type="button" class="cart-item-qty-btn" onclick="updateCartQuantity(${item.id}, -1)">-</button>
          <span style="font-size: 0.85rem; font-weight: 700;">${item.quantity}</span>
          <button type="button" class="cart-item-qty-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
        </div>
      </div>
      <button type="button" class="cart-item-remove" onclick="removeFromCart(${item.id})" title="Remover item">
        <i class="fas fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

function openCartDrawer() {
  const drawer = document.getElementById('cartBackdrop');
  if (drawer) drawer.classList.add('active');
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartBackdrop');
  if (drawer) drawer.classList.remove('active');
}

// ==========================================================================
// CHECKOUT VIA WHATSAPP (996187306)
// ==========================================================================
function handleWhatsAppCheckout() {
  if (state.cart.length === 0) {
    showToast('Adicione pelo menos um item à sacola para pedir!');
    return;
  }

  const custName = (document.getElementById('custName')?.value || '').trim();
  const custAddress = (document.getElementById('custAddress')?.value || '').trim();
  const custPayment = document.getElementById('custPayment')?.value || 'Pix';

  const totalPrice = state.cart.reduce((acc, item) => acc + (item.preco * item.quantity), 0);
  const totalItems = state.cart.reduce((acc, item) => acc + item.quantity, 0);

  // Registra pedido real no histórico local do admin
  try {
    const ordersHistory = JSON.parse(localStorage.getItem(CONFIG.ORDERS_STORAGE_KEY) || '[]');
    ordersHistory.unshift({
      id: `PED-${Date.now().toString().slice(-4)}`,
      cliente: custName || 'Cliente WhatsApp',
      telefone: CONFIG.WHATSAPP_NUMBER,
      itens: state.cart.map(i => `${i.quantity}x ${i.nome}`).join(', '),
      total: totalPrice,
      pagamento: custPayment,
      data: new Date().toLocaleString('pt-BR'),
      status: 'Finalizado no WhatsApp'
    });
    localStorage.setItem(CONFIG.ORDERS_STORAGE_KEY, JSON.stringify(ordersHistory));
  } catch (e) {}

  // Mensagem estruturada
  let msg = `🛍️ *NOVO PEDIDO - STARGIRL* 🛍️\n\n`;
  msg += `Olá! Gostaria de finalizar a compra dos seguintes itens da loja:\n\n`;

  state.cart.forEach((item, index) => {
    const itemTotal = formatCurrency(item.preco * item.quantity);
    msg += `*${index + 1}.* ${item.nome}\n`;
    msg += `   • Quantidade: ${item.quantity}x (${formatCurrency(item.preco)} un.) = ${itemTotal}\n`;
    if (item.nome_categoria) msg += `   • Categoria: ${item.nome_categoria}\n`;
    msg += `\n`;
  });

  msg += `--------------------------------------\n`;
  msg += `📦 *Total de Itens:* ${totalItems}\n`;
  msg += `💰 *VALOR TOTAL:* ${formatCurrency(totalPrice)}\n`;
  msg += `💳 *Forma de Pagamento:* ${custPayment}\n`;
  msg += `--------------------------------------\n\n`;

  if (custName) msg += `👤 *Cliente:* ${custName}\n`;
  if (custAddress) msg += `📍 *Endereço / Retirada:* ${custAddress}\n`;

  msg += `\n⭐ Poderia me informar o valor do frete e os dados para pagamento? Muito obrigada! ✨`;

  const waUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

function handleDirectProductWhatsApp(product, qty) {
  const itemTotal = formatCurrency(product.preco * qty);
  let msg = `⭐ *PEDIDO RÁPIDO - STARGIRL* ⭐\n\n`;
  msg += `Olá! Gostaria de comprar o seguinte produto direto do site:\n\n`;
  msg += `• *Produto:* ${product.nome}\n`;
  msg += `• *Quantidade:* ${qty}x\n`;
  msg += `• *Valor Unitário:* ${formatCurrency(product.preco)}\n`;
  msg += `• *Total:* ${itemTotal}\n\n`;
  msg += `Ainda está disponível? Como podemos combinar pagamento e entrega? ✨`;

  const waUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

// ==========================================================================
// CONFIGURAÇÃO DOS EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
  // 1. Busca Server-side Dinâmica (debounce)
  const searchInput = document.getElementById('filterSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(filterDebounceTimer);
      state.filters.texto = e.target.value.trim();
      filterDebounceTimer = setTimeout(() => {
        fetchProducts();
      }, 350);
    });
  }

  // 2. Select Dinâmico de Categoria
  const catSelect = document.getElementById('filterCategory');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      state.filters.categoria = e.target.value;
      fetchProducts();
    });
  }

  // 3. Select de Estação (Inverno / Verão)
  const seasonSelect = document.getElementById('filterSeason');
  if (seasonSelect) {
    seasonSelect.addEventListener('change', (e) => {
      state.filters.season = e.target.value;
      fetchProducts();
    });
  }

  // 4. Faixa de Preço
  const minPrice = document.getElementById('filterPriceMin');
  const maxPrice = document.getElementById('filterPriceMax');
  const handlePriceChange = () => {
    clearTimeout(filterDebounceTimer);
    state.filters.precoMin = minPrice.value;
    state.filters.precoMax = maxPrice.value;
    filterDebounceTimer = setTimeout(() => {
      fetchProducts();
    }, 400);
  };
  if (minPrice) minPrice.addEventListener('input', handlePriceChange);
  if (maxPrice) maxPrice.addEventListener('input', handlePriceChange);

  // 5. Botão Limpar Filtros
  const btnClear = document.getElementById('btnClearFilters');
  if (btnClear) {
    btnClear.addEventListener('click', clearAllFilters);
  }

  // 6. Clique nos Cards da Divisória Inverno & Verão
  document.querySelectorAll('.season-card').forEach(card => {
    card.addEventListener('click', () => {
      const season = card.getAttribute('data-season');
      state.filters.season = season;
      if (seasonSelect) seasonSelect.value = season;
      fetchProducts();

      const catalogoSection = document.getElementById('catalogo');
      if (catalogoSection) catalogoSection.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 7. Links da Nav com Filtros Rápidos
  document.querySelectorAll('.nav-link, .footer-col a').forEach(link => {
    link.addEventListener('click', (e) => {
      const season = link.getAttribute('data-filter-season');
      const cat = link.getAttribute('data-filter-cat');

      if (season || cat) {
        if (season) {
          state.filters.season = season;
          if (seasonSelect) seasonSelect.value = season;
        }
        if (cat) {
          state.filters.categoria = cat;
          if (catSelect) catSelect.value = cat;
        }
        fetchProducts();

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        if (link.classList.contains('nav-link')) link.classList.add('active');
      }
    });
  });

  // 8. Controles do Carrinho
  const btnOpenCart = document.getElementById('btnOpenCart');
  const btnCloseCart = document.getElementById('btnCloseCart');
  const cartBackdrop = document.getElementById('cartBackdrop');
  const btnCheckoutWA = document.getElementById('btnCheckoutWhatsApp');

  if (btnOpenCart) btnOpenCart.addEventListener('click', openCartDrawer);
  if (btnCloseCart) btnCloseCart.addEventListener('click', closeCartDrawer);
  if (cartBackdrop) {
    cartBackdrop.addEventListener('click', (e) => {
      if (e.target === cartBackdrop) closeCartDrawer();
    });
  }
  if (btnCheckoutWA) btnCheckoutWA.addEventListener('click', handleWhatsAppCheckout);

  // 9. Controles do Modal de Produto
  const btnCloseModal = document.getElementById('btnCloseModal');
  const productModal = document.getElementById('productModal');
  const modalMinus = document.getElementById('modalQtyMinus');
  const modalPlus = document.getElementById('modalQtyPlus');
  const modalQtyInput = document.getElementById('modalQtyInput');
  const modalBtnAddCart = document.getElementById('modalBtnAddToCart');
  const modalBtnBuyWA = document.getElementById('modalBtnBuyWhatsApp');

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeProductModal);
  if (productModal) {
    productModal.addEventListener('click', (e) => {
      if (e.target === productModal) closeProductModal();
    });
  }

  if (modalMinus && modalQtyInput) {
    modalMinus.addEventListener('click', () => {
      let val = parseInt(modalQtyInput.value, 10) || 1;
      if (val > 1) modalQtyInput.value = val - 1;
    });
  }

  if (modalPlus && modalQtyInput) {
    modalPlus.addEventListener('click', () => {
      let val = parseInt(modalQtyInput.value, 10) || 1;
      modalQtyInput.value = val + 1;
    });
  }

  if (modalBtnAddCart) {
    modalBtnAddCart.addEventListener('click', () => {
      if (!state.activeModalProduct) return;
      const qty = parseInt(modalQtyInput.value, 10) || 1;
      addToCart(state.activeModalProduct, qty);
      closeProductModal();
      showToast(`✨ ${qty}x "${state.activeModalProduct.nome}" na sacola!`);
      openCartDrawer();
    });
  }

  if (modalBtnBuyWA) {
    modalBtnBuyWA.addEventListener('click', () => {
      if (!state.activeModalProduct) return;
      const qty = parseInt(modalQtyInput.value, 10) || 1;
      handleDirectProductWhatsApp(state.activeModalProduct, qty);
    });
  }

  // Tecla ESC para fechar modais
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeCartDrawer();
    }
  });
}

function clearAllFilters() {
  state.filters.texto = '';
  state.filters.categoria = '';
  state.filters.season = 'todas';
  state.filters.precoMin = '';
  state.filters.precoMax = '';

  const search = document.getElementById('filterSearch');
  const cat = document.getElementById('filterCategory');
  const season = document.getElementById('filterSeason');
  const min = document.getElementById('filterPriceMin');
  const max = document.getElementById('filterPriceMax');

  if (search) search.value = '';
  if (cat) cat.value = '';
  if (season) season.value = 'todas';
  if (min) min.value = '';
  if (max) max.value = '';

  fetchProducts();
}

function updateActiveChips() {
  const container = document.getElementById('activeFilterChips');
  if (!container) return;

  const chips = [];
  if (state.filters.texto) chips.push({ label: `Busca: "${state.filters.texto}"`, key: 'texto' });
  if (state.filters.categoria) chips.push({ label: `Categoria: ${state.filters.categoria}`, key: 'categoria' });
  if (state.filters.season && state.filters.season !== 'todas') {
    chips.push({ label: `Estação: ${state.filters.season === 'inverno' ? '❄️ Inverno' : '☀️ Verão'}`, key: 'season' });
  }
  if (state.filters.precoMin || state.filters.precoMax) {
    chips.push({ label: `Preço: R$ ${state.filters.precoMin || '0'} - R$ ${state.filters.precoMax || '∞'}`, key: 'preco' });
  }

  container.innerHTML = chips.map(c => `
    <span class="filter-chip">
      ${c.label}
      <button onclick="removeFilterChip('${c.key}')" title="Remover filtro">&times;</button>
    </span>
  `).join('');
}

function removeFilterChip(key) {
  if (key === 'texto') {
    state.filters.texto = '';
    const el = document.getElementById('filterSearch');
    if (el) el.value = '';
  } else if (key === 'categoria') {
    state.filters.categoria = '';
    const el = document.getElementById('filterCategory');
    if (el) el.value = '';
  } else if (key === 'season') {
    state.filters.season = 'todas';
    const el = document.getElementById('filterSeason');
    if (el) el.value = 'todas';
  } else if (key === 'preco') {
    state.filters.precoMin = '';
    state.filters.precoMax = '';
    const elMin = document.getElementById('filterPriceMin');
    const elMax = document.getElementById('filterPriceMax');
    if (elMin) elMin.value = '';
    if (elMax) elMax.value = '';
  }
  fetchProducts();
}

function formatCurrency(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fas fa-sparkles" style="color: var(--pastel-pink-vibrant)"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Funções globais para botões inline
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.clearAllFilters = clearAllFilters;
window.removeFilterChip = removeFilterChip;
window.fetchProducts = fetchProducts;
