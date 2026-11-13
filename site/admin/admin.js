/**
 * ==========================================================================
 * Y2K ADMIN PANEL - ADMIN.JS
 * Vanilla JS (ES6+)
 * 100% Integrado à API REST (Sem Mocks)
 * Gestão de Recursos (CRUD), Layout 1fr / 4fr & Sincronia com o Backend
 * ==========================================================================
 */

// Determina a URL base da API dinamicamente (Compatível com Localhost e Vercel)
const getApiBaseUrl = () => {
  if (window.location.port === '5500' || window.location.port === '5501') {
    return 'http://localhost:3333/api';
  }
  return '/api';
};

const CONFIG = {
  API_BASE_URL: getApiBaseUrl(),
  STORAGE_USER_KEY: 'y2k_admin_user',
  WHATSAPP_NUMBER: '55996187306',
  ORDERS_STORAGE_KEY: 'y2k_whatsapp_orders'
};

// Estado do Painel Admin
const adminState = {
  currentUser: null,
  activeModule: 'produtos', // 'produtos', 'categorias', 'lojas', 'pedidos', 'metricas'
  activeStoreId: null,
  stores: [],
  categories: [],
  products: []
};

// ==========================================================================
// INICIALIZAÇÃO & VERIFICAÇÃO DE AUTENTICAÇÃO
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();
  setupSidebarNavigation();
  setupStoreSelector();
  setupCrudModalListeners();

  await loadStores();
  await loadCategories();
  await loadModule(adminState.activeModule);
});

function checkAuth() {
  const userJson = localStorage.getItem(CONFIG.STORAGE_USER_KEY);
  if (!userJson) {
    window.location.href = 'login.html';
    return;
  }
  adminState.currentUser = JSON.parse(userJson);

  const nameEl = document.getElementById('sidebarUserName');
  const emailEl = document.getElementById('sidebarUserEmail');
  if (nameEl) nameEl.textContent = adminState.currentUser.nome || 'Administrador';
  if (emailEl) emailEl.textContent = adminState.currentUser.email || 'admin@y2kstore.com';

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem(CONFIG.STORAGE_USER_KEY);
      window.location.href = 'login.html';
    });
  }
}

// ==========================================================================
// CARREGAMENTO DE DADOS BASE DA API: LOJAS & CATEGORIAS
// ==========================================================================
async function loadStores() {
  const selector = document.getElementById('activeStoreSelect');
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/lojas`);
    if (res.ok) {
      const data = await res.json();
      adminState.stores = data.lojas || [];
      if (adminState.stores.length > 0) {
        adminState.activeStoreId = adminState.stores[0].id;
      }
    } else {
      adminState.stores = [];
    }
  } catch (err) {
    console.error('Erro ao buscar lojas na API:', err);
    adminState.stores = [];
  }

  if (selector) {
    if (adminState.stores.length === 0) {
      selector.innerHTML = '<option value="">Nenhuma loja cadastrada</option>';
    } else {
      selector.innerHTML = adminState.stores.map(store => `
        <option value="${store.id}">Loja #${store.id}: ${store.nome}</option>
      `).join('');
    }
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/categorias`);
    if (res.ok) {
      const data = await res.json();
      adminState.categories = data.categorias || [];
    } else {
      adminState.categories = [];
    }
  } catch (err) {
    console.error('Erro ao buscar categorias na API:', err);
    adminState.categories = [];
  }
}

function setupStoreSelector() {
  const select = document.getElementById('activeStoreSelect');
  if (select) {
    select.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      adminState.activeStoreId = isNaN(val) ? null : val;
      loadModule(adminState.activeModule);
    });
  }
}

// ==========================================================================
// NAVEGAÇÃO ENTRE OS MÓDULOS (SIDEBAR)
// ==========================================================================
function setupSidebarNavigation() {
  const items = document.querySelectorAll('#sidebarModulesList .sidebar-nav-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const mod = item.getAttribute('data-module');
      loadModule(mod);
    });
  });
}

async function loadModule(moduleName) {
  adminState.activeModule = moduleName;
  const contentArea = document.getElementById('moduleContentArea');
  const title = document.getElementById('moduleTitle');
  const subtitle = document.getElementById('moduleSubtitle');
  const btnCreate = document.getElementById('btnOpenCreateModal');
  const btnCreateText = document.getElementById('btnCreateText');

  if (moduleName === 'produtos') {
    title.textContent = 'Gestão de Produtos';
    subtitle.textContent = 'Gerencie o catálogo completo, fotos, preços e estoque da loja via API.';
    btnCreate.style.display = 'inline-flex';
    btnCreateText.textContent = 'Criar Produto';
    await renderProductsModule(contentArea);
  } else if (moduleName === 'categorias') {
    title.textContent = 'Gestão de Categorias';
    subtitle.textContent = 'Crie e organize as categorias do banco de dados (/api/categorias).';
    btnCreate.style.display = 'inline-flex';
    btnCreateText.textContent = 'Criar Categoria';
    await renderCategoriesModule(contentArea);
  } else if (moduleName === 'lojas') {
    title.textContent = 'Lojas & Mostruário';
    subtitle.textContent = 'Configuração das lojas cadastradas no banco de dados (/api/lojas).';
    btnCreate.style.display = 'none';
    await renderStoresModule(contentArea);
  } else if (moduleName === 'pedidos') {
    title.textContent = 'Histórico de Pedidos WhatsApp';
    subtitle.textContent = 'Solicitações de compra geradas pelos clientes via WhatsApp (996187306).';
    btnCreate.style.display = 'none';
    renderOrdersModule(contentArea);
  } else if (moduleName === 'metricas') {
    title.textContent = 'Visão Geral & Métricas';
    subtitle.textContent = 'Indicadores calculados com base nos registros reais da API.';
    btnCreate.style.display = 'none';
    await renderMetricsModule(contentArea);
  }
}

// ==========================================================================
// MÓDULO 1: PRODUTOS (CRUD COMPLETO VIA API)
// ==========================================================================
async function renderProductsModule(container) {
  if (!adminState.activeStoreId) {
    container.innerHTML = `
      <div class="cart-empty-state" style="padding: 50px 20px;">
        <i class="fas fa-store-slash" style="font-size: 2.5rem; color: #FF6B8B;"></i>
        <h4>Nenhuma loja ativa selecionada</h4>
        <p>Cadastre uma loja no banco de dados para vincular produtos.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--pastel-pink-dark);">
      <i class="fas fa-spinner fa-spin fa-2x"></i>
      <p style="margin-top: 10px;">Consultando produtos na API (/api/produtos/loja/${adminState.activeStoreId})...</p>
    </div>
  `;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/produtos/loja/${adminState.activeStoreId}`);
    if (res.ok) {
      const data = await res.json();
      adminState.products = data.produtos || [];
    } else {
      adminState.products = [];
      showAdminToast('Não foi possível listar os produtos da loja.');
    }
  } catch (e) {
    console.error('Erro de conexão com /api/produtos:', e);
    adminState.products = [];
    container.innerHTML = `
      <div class="cart-empty-state" style="padding: 40px 20px;">
        <i class="fas fa-triangle-exclamation" style="font-size: 2.5rem; color: #FF6B8B;"></i>
        <h4>Erro ao conectar à API de Produtos</h4>
        <p>Verifique se o backend está executando e o Supabase está configurado.</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="admin-table-filters">
      <div class="search-box-admin">
        <i class="fas fa-search" style="color: var(--text-muted)"></i>
        <input type="text" id="adminProductSearch" placeholder="Buscar por nome ou descrição...">
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted)">
        Total na API: <strong>${adminState.products.length}</strong> produtos
      </div>
    </div>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Imagem</th>
            <th>Nome do Produto</th>
            <th>Categoria</th>
            <th>Preço (R$)</th>
            <th>Estoque</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody id="adminProductsTableBody">
          ${renderProductRows(adminState.products)}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;

  // Busca interna na tabela
  const searchInput = document.getElementById('adminProductSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      const filtered = adminState.products.filter(p =>
        p.nome.toLowerCase().includes(val) ||
        (p.descricao && p.descricao.toLowerCase().includes(val))
      );
      document.getElementById('adminProductsTableBody').innerHTML = renderProductRows(filtered);
      attachProductRowListeners();
    });
  }

  attachProductRowListeners();
}

function renderProductRows(products) {
  if (products.length === 0) {
    return `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">Nenhum produto cadastrado no banco de dados para esta loja.</td></tr>`;
  }

  return products.map(p => `
    <tr>
      <td><strong>#${p.id}</strong></td>
      <td>
        <img src="${p.imagem_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200&auto=format&fit=crop&q=80'}" alt="${p.nome}" class="table-img-thumb" onerror="this.src='https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=200&auto=format&fit=crop&q=80'">
      </td>
      <td>
        <strong style="display: block;">${p.nome}</strong>
        <small style="color: var(--text-muted);">${(p.descricao || '').substring(0, 45)}${(p.descricao || '').length > 45 ? '...' : ''}</small>
      </td>
      <td>
        <span class="badge-tag pink">${p.nome_categoria || 'ID ' + p.id_categoria}</span>
      </td>
      <td><strong>R$ ${Number(p.preco || 0).toFixed(2).replace('.', ',')}</strong></td>
      <td>
        <span class="badge-tag ${p.quantidade < 10 ? 'blue' : 'green'}">
          ${p.quantidade} un
        </span>
      </td>
      <td>
        <div class="table-actions" style="justify-content: flex-end;">
          <button type="button" class="btn-action-icon edit" data-id="${p.id}" title="Editar produto">
            <i class="fas fa-pencil"></i>
          </button>
          <button type="button" class="btn-action-icon delete" data-id="${p.id}" title="Excluir produto">
            <i class="fas fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function attachProductRowListeners() {
  document.querySelectorAll('.table-actions .btn-action-icon.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      const prod = adminState.products.find(p => p.id === id);
      if (prod) openEditProductModal(prod);
    });
  });

  document.querySelectorAll('.table-actions .btn-action-icon.delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      confirmDeleteProduct(id);
    });
  });
}

// ==========================================================================
// MÓDULO 2: CATEGORIAS (CRUD COMPLETO VIA API)
// ==========================================================================
async function renderCategoriesModule(container) {
  await loadCategories();

  if (adminState.categories.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state" style="padding: 40px 20px;">
        <i class="fas fa-tags" style="font-size: 2.5rem; color: var(--pastel-pink-dark);"></i>
        <h4>Nenhuma categoria cadastrada no banco de dados</h4>
        <p>Clique em "Criar Categoria" no topo para adicionar a primeira categoria.</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 100px;">ID</th>
            <th>Nome da Categoria</th>
            <th style="text-align: right; width: 140px;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${adminState.categories.map(cat => `
            <tr>
              <td><strong>#${cat.id}</strong></td>
              <td>
                <span style="font-size: 1.05rem; font-weight: 700;">${cat.nome}</span>
              </td>
              <td>
                <div class="table-actions" style="justify-content: flex-end;">
                  <button type="button" class="btn-action-icon edit edit-cat" data-id="${cat.id}" data-name="${cat.nome}" title="Editar Categoria">
                    <i class="fas fa-pencil"></i>
                  </button>
                  <button type="button" class="btn-action-icon delete delete-cat" data-id="${cat.id}" title="Excluir Categoria">
                    <i class="fas fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;

  container.querySelectorAll('.edit-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      openEditCategoryModal(id, name);
    });
  });

  container.querySelectorAll('.delete-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      confirmDeleteCategory(id);
    });
  });
}

// ==========================================================================
// MÓDULO 3: LOJAS (VIA API /api/lojas)
// ==========================================================================
async function renderStoresModule(container) {
  await loadStores();

  if (adminState.stores.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state" style="padding: 40px 20px;">
        <i class="fas fa-store-slash" style="font-size: 2.5rem; color: #FF6B8B;"></i>
        <h4>Nenhuma loja cadastrada no banco de dados</h4>
        <p>Cadastre uma loja na tabela <code>lojas</code> para gerenciar o mostruário.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
      ${adminState.stores.map(store => `
        <div class="stat-card" style="flex-direction: column; align-items: flex-start;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
            <div class="stat-icon pink"><i class="fas fa-store"></i></div>
            <div>
              <h4 style="font-size: 1.2rem;">${store.nome}</h4>
              <span style="color: var(--pastel-pink-dark); font-weight: bold;">Loja ID: #${store.id}</span>
            </div>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 14px;">
            ${store.descricao || 'Sem descrição cadastrada na tabela lojas.'}
          </p>
          <div style="font-size: 0.82rem; background: var(--pastel-green-soft); padding: 6px 12px; border-radius: var(--radius-pill); color: var(--pastel-green-dark); font-weight: 700;">
            <i class="fas fa-check-circle"></i> Integrada ao WhatsApp 996187306
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ==========================================================================
// MÓDULO 4: PEDIDOS WHATSAPP (HISTÓRICO REAL REGISTRADO PELO CLIENTE)
// ==========================================================================
function renderOrdersModule(container) {
  let realOrders = [];
  try {
    realOrders = JSON.parse(localStorage.getItem(CONFIG.ORDERS_STORAGE_KEY) || '[]');
  } catch (e) {
    realOrders = [];
  }

  if (realOrders.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state" style="padding: 50px 20px;">
        <i class="fab fa-whatsapp" style="font-size: 3rem; color: #25D366;"></i>
        <h4>Nenhum pedido recebido via WhatsApp até o momento</h4>
        <p>Quando um cliente finalizar uma compra na sacola, os dados do pedido serão registrados aqui.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Itens Solicitados</th>
            <th>Total</th>
            <th>Pagamento</th>
            <th>Data</th>
            <th>Status WhatsApp</th>
          </tr>
        </thead>
        <tbody>
          ${realOrders.map(o => `
            <tr>
              <td><strong>${o.id}</strong></td>
              <td>${o.cliente}</td>
              <td><small>${o.itens}</small></td>
              <td><strong>R$ ${Number(o.total || 0).toFixed(2).replace('.', ',')}</strong></td>
              <td><span class="badge-tag blue">${o.pagamento}</span></td>
              <td><small style="color: var(--text-muted);">${o.data}</small></td>
              <td>
                <a href="https://wa.me/55996187306" target="_blank" class="badge-tag green" style="text-decoration: none;">
                  <i class="fab fa-whatsapp"></i> ${o.status}
                </a>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ==========================================================================
// MÓDULO 5: MÉTRICAS BASEADAS NOS DADOS DA API
// ==========================================================================
async function renderMetricsModule(container) {
  if (adminState.activeStoreId) {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/produtos/loja/${adminState.activeStoreId}`);
      if (res.ok) {
        const data = await res.json();
        adminState.products = data.produtos || [];
      }
    } catch (e) { }
  }

  const totalProducts = adminState.products.length;
  const totalStockUnits = adminState.products.reduce((acc, p) => acc + (Number(p.quantidade) || 0), 0);
  const totalInventoryValue = adminState.products.reduce((acc, p) => acc + (Number(p.preco || 0) * (Number(p.quantidade) || 0)), 0);

  const winterCount = adminState.products.filter(p => {
    const txt = ((p.nome_categoria || '') + ' ' + (p.nome || '')).toLowerCase();
    return txt.includes('inverno') || txt.includes('jaqueta') || txt.includes('moletom') || txt.includes('casaco');
  }).length;

  const summerCount = adminState.products.filter(p => {
    const txt = ((p.nome_categoria || '') + ' ' + (p.nome || '')).toLowerCase();
    return txt.includes('verão') || txt.includes('verao') || txt.includes('baby') || txt.includes('saia');
  }).length;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon pink"><i class="fas fa-boxes-stacked"></i></div>
        <div class="stat-content">
          <h4>${totalProducts}</h4>
          <span>Produtos Cadastrados na API</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-warehouse"></i></div>
        <div class="stat-content">
          <h4>${totalStockUnits} un</h4>
          <span>Estoque Total em Loja</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-brazilian-real-sign"></i></div>
        <div class="stat-content">
          <h4>R$ ${totalInventoryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          <span>Patrimônio em Estoque</span>
        </div>
      </div>
    </div>

    <!-- Divisória Sazonal no Painel -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
      <div style="background: var(--pastel-blue-soft); border: 2px solid var(--pastel-blue); border-radius: var(--radius-md); padding: 20px;">
        <h4 style="font-family: var(--font-heading); font-size: 1.2rem; color: #1F6170; display: flex; align-items: center; gap: 8px;">
          ❄️ Coleção Inverno Y2K
        </h4>
        <p style="font-size: 0.9rem; margin-top: 6px; color: #3A6D78;">
          Total de <strong>${winterCount} produtos</strong> de inverno mapeados no banco.
        </p>
      </div>

      <div style="background: var(--pastel-pink-soft); border: 2px solid var(--pastel-pink); border-radius: var(--radius-md); padding: 20px;">
        <h4 style="font-family: var(--font-heading); font-size: 1.2rem; color: #C24263; display: flex; align-items: center; gap: 8px;">
          ☀️ Coleção Verão Y2K
        </h4>
        <p style="font-size: 0.9rem; margin-top: 6px; color: #7B3E4F;">
          Total de <strong>${summerCount} produtos</strong> de verão mapeados no banco.
        </p>
      </div>
    </div>
  `;
}

// ==========================================================================
// MODAL DINÂMICO DE CRIAÇÃO & EDIÇÃO (CRUD)
// Colunas reais mapeadas do SQL (PROMPT MESTRE):
// produtos: (nome, descricao, preco, quantidade, id_categoria, id_loja, imagem_url)
// categorias: (nome)
// ==========================================================================
function setupCrudModalListeners() {
  const btnOpen = document.getElementById('btnOpenCreateModal');
  const btnClose = document.getElementById('btnCloseCrudModal');
  const btnCancel = document.getElementById('btnCancelCrudModal');
  const overlay = document.getElementById('crudModalOverlay');
  const form = document.getElementById('crudDynamicForm');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      openCreateModal(adminState.activeModule);
    });
  }

  if (btnClose) btnClose.addEventListener('click', closeCrudModal);
  if (btnCancel) btnCancel.addEventListener('click', closeCrudModal);

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCrudModal();
    });
  }

  if (form) {
    form.addEventListener('submit', handleCrudFormSubmit);
  }
}

function openCreateModal(moduleName) {
  const title = document.getElementById('crudModalTitle');
  const fields = document.getElementById('crudFormFields');
  const recordId = document.getElementById('crudRecordId');
  const overlay = document.getElementById('crudModalOverlay');

  recordId.value = '';

  if (moduleName === 'produtos') {
    title.textContent = 'Cadastrar Novo Produto na API';
    fields.innerHTML = `
      <div class="form-group col-span-2">
        <label for="formProdNome">Nome do Produto *</label>
        <input type="text" id="formProdNome" class="form-input" required placeholder="Ex: Jaqueta Puffer Pastel">
      </div>

      <div class="form-group col-span-2">
        <label for="formProdDescricao">Descrição Detalhada</label>
        <textarea id="formProdDescricao" class="form-input" rows="3" placeholder="Descrição do produto..."></textarea>
      </div>

      <div class="form-group">
        <label for="formProdPreco">Preço (R$) *</label>
        <input type="number" step="0.01" min="0" id="formProdPreco" class="form-input" required placeholder="149.90">
      </div>

      <div class="form-group">
        <label for="formProdQtd">Quantidade em Estoque *</label>
        <input type="number" min="0" id="formProdQtd" class="form-input" required placeholder="10">
      </div>

      <div class="form-group col-span-2">
        <label for="formProdCategoria">Categoria *</label>
        <select id="formProdCategoria" class="form-input" required>
          ${adminState.categories.length === 0 ? '<option value="">Nenhuma categoria cadastrada</option>' : ''}
          ${adminState.categories.map(c => `
            <option value="${c.id}">${c.nome}</option>
          `).join('')}
        </select>
      </div>

      <!-- Upload de Imagem via API (/api/produtos/upload) ou URL -->
      <div class="form-group col-span-2">
        <label>Imagem do Produto (Upload ou Link)</label>
        <div class="image-upload-preview-box">
          <img id="formImgPreview" src="" alt="Preview" class="upload-preview-thumb" style="display: none;">
          <div class="upload-controls">
            <input type="file" id="formProdFile" accept="image/*" style="font-size: 0.8rem; margin-bottom: 6px;">
            <input type="url" id="formProdImgUrl" class="form-input" placeholder="Ou cole a URL da imagem aqui" value="">
          </div>
        </div>
      </div>
    `;

    setupImageUploadHandlers();

  } else if (moduleName === 'categorias') {
    title.textContent = 'Criar Nova Categoria na API';
    fields.innerHTML = `
      <div class="form-group col-span-2">
        <label for="formCatNome">Nome da Categoria *</label>
        <input type="text" id="formCatNome" class="form-input" required placeholder="Ex: Roupas de Inverno">
      </div>
    `;
  }

  overlay.classList.add('active');
}

function openEditProductModal(product) {
  openCreateModal('produtos');
  document.getElementById('crudModalTitle').textContent = `Editar Produto: ${product.nome}`;
  document.getElementById('crudRecordId').value = product.id;

  document.getElementById('formProdNome').value = product.nome;
  document.getElementById('formProdDescricao').value = product.descricao || '';
  document.getElementById('formProdPreco').value = product.preco;
  document.getElementById('formProdQtd').value = product.quantidade;
  document.getElementById('formProdCategoria').value = product.id_categoria || '';

  if (product.imagem_url) {
    document.getElementById('formProdImgUrl').value = product.imagem_url;
    const preview = document.getElementById('formImgPreview');
    preview.src = product.imagem_url;
    preview.style.display = 'block';
  }
}

function openEditCategoryModal(id, name) {
  openCreateModal('categorias');
  document.getElementById('crudModalTitle').textContent = `Editar Categoria #${id}`;
  document.getElementById('crudRecordId').value = id;
  document.getElementById('formCatNome').value = name;
}

function closeCrudModal() {
  const overlay = document.getElementById('crudModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

// Configura o upload de arquivos para a rota /api/produtos/upload
function setupImageUploadHandlers() {
  const fileInput = document.getElementById('formProdFile');
  const urlInput = document.getElementById('formProdImgUrl');
  const preview = document.getElementById('formImgPreview');

  if (urlInput) {
    urlInput.addEventListener('input', () => {
      if (urlInput.value) {
        preview.src = urlInput.value;
        preview.style.display = 'block';
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);

      // Envia multipart/form-data real para POST /api/produtos/upload
      const formData = new FormData();
      formData.append('imagem', file);

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/produtos/upload`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data.imagem_url) {
            urlInput.value = data.imagem_url;
            showAdminToast('Upload da imagem concluído na API!');
          }
        } else {
          showAdminToast('Falha no upload da imagem.');
        }
      } catch (err) {
        console.error('Erro no upload de imagem:', err);
        showAdminToast('Erro ao enviar imagem para a API.');
      }
    });
  }
}

// ==========================================================================
// SUBMISSÃO DO CRUD & SINCRONIA COM A API
// ==========================================================================
async function handleCrudFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('crudRecordId').value;
  const isEdit = Boolean(id);
  const btnSubmit = document.getElementById('btnSubmitCrudModal');

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando na API...';

  try {
    if (adminState.activeModule === 'produtos') {
      const payload = {
        nome: document.getElementById('formProdNome').value.trim(),
        descricao: document.getElementById('formProdDescricao').value.trim(),
        preco: parseFloat(document.getElementById('formProdPreco').value),
        quantidade: parseInt(document.getElementById('formProdQtd').value, 10),
        id_categoria: parseInt(document.getElementById('formProdCategoria').value, 10),
        id_loja: adminState.activeStoreId,
        imagem_url: document.getElementById('formProdImgUrl').value.trim() || null
      };

      if (!payload.id_loja) {
        alert('Selecione ou cadastre uma loja primeiro.');
        return;
      }

      if (isEdit) {
        // PUT /api/produtos/:id
        const res = await fetch(`${CONFIG.API_BASE_URL}/produtos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        showAdminToast(data.mensagem || 'Produto atualizado na API!');
      } else {
        // POST /api/produtos/criar
        const res = await fetch(`${CONFIG.API_BASE_URL}/produtos/criar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        showAdminToast(data.mensagem || 'Produto criado com sucesso na API!');
      }

    } else if (adminState.activeModule === 'categorias') {
      const nome = document.getElementById('formCatNome').value.trim();
      if (isEdit) {
        // PUT /api/categorias/:id
        const res = await fetch(`${CONFIG.API_BASE_URL}/categorias/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome })
        });
        const data = await res.json();
        showAdminToast(data.mensagem || 'Categoria atualizada na API!');
      } else {
        // POST /api/categorias/criar
        const res = await fetch(`${CONFIG.API_BASE_URL}/categorias/criar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome })
        });
        const data = await res.json();
        showAdminToast(data.messagem || data.mensagem || 'Categoria criada na API!');
      }
    }

    closeCrudModal();
    await loadModule(adminState.activeModule);

  } catch (err) {
    console.error('Erro ao salvar no backend:', err);
    showAdminToast('Erro ao comunicar com a API.');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<i class="fas fa-floppy-disk"></i> Salvar Registro';
  }
}

// Exclusão de Produto via DELETE /api/produtos/:id
async function confirmDeleteProduct(id) {
  if (!confirm(`Tem certeza que deseja excluir o produto #${id} do banco de dados?`)) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/produtos/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showAdminToast(data.mensagem || 'Produto excluído da API com sucesso!');
    } else {
      showAdminToast(data.mensagem || 'Erro ao excluir produto.');
    }
  } catch (e) {
    console.error('Erro na exclusão do produto:', e);
    showAdminToast('Erro de conexão com a API.');
  }

  await loadModule('produtos');
}

// Exclusão de Categoria via DELETE /api/categorias/:id
async function confirmDeleteCategory(id) {
  if (!confirm(`Deseja remover a categoria #${id} do banco de dados?`)) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/categorias/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json().catch(() => ({}));
    showAdminToast(data.mensagem || 'Categoria removida com sucesso!');
  } catch (e) {
    console.error('Erro na exclusão da categoria:', e);
    showAdminToast('Erro de conexão com a API.');
  }

  await loadModule('categorias');
}

// Feedback visual
function showAdminToast(msg) {
  const box = document.getElementById('adminToastBox');
  if (!box) return;

  const t = document.createElement('div');
  t.style.background = '#2E243A';
  t.style.color = '#FFF';
  t.style.padding = '12px 20px';
  t.style.borderRadius = '30px';
  t.style.fontSize = '0.9rem';
  t.style.fontWeight = 'bold';
  t.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
  t.style.border = '2px solid var(--pastel-pink)';
  t.style.marginBottom = '8px';
  t.innerHTML = `<i class="fas fa-check-circle" style="color: #67B6C8; margin-right: 8px;"></i> ${msg}`;
  box.appendChild(t);

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 2500);
}
