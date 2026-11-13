import supabase from '../db/config.js';

async function CriarProduto(request, response) {
    try {
        const {
            nome,
            descricao,
            preco,
            quantidade,
            id_categoria,
            id_loja,
            imagem_url
        } = request.body;

        if (!id_categoria) {
            return response.status(400).json({
                mensagem: "O id_categoria é obrigatório;"
            });
        }

        if (!id_loja) {
            return response.status(400).json({
                mensagem: "O id_loja é obrigatório;"
            });
        }

        // Validação de existência da categoria
        const { data: categorias, error: catError } = await supabase
            .from('categorias')
            .select('id')
            .eq('id', id_categoria);

        if (catError || !categorias || !categorias[0]) {
            return response.status(404).json({
                mensagem: "Categoria não encontrada"
            });
        }

        // Validação de existência da loja
        const { data: lojas, error: lojaError } = await supabase
            .from('lojas')
            .select('id')
            .eq('id', id_loja);

        if (lojaError || !lojas || !lojas[0]) {
            return response.status(404).json({
                mensagem: "Loja não encontrada"
            });
        }

        const { error: insertError } = await supabase
            .from('produtos')
            .insert([{
                nome,
                descricao: descricao || null,
                preco: Number(preco) || 0,
                quantidade: Number(quantidade) || 0,
                id_categoria: Number(id_categoria),
                id_loja: Number(id_loja),
                imagem_url: imagem_url || null
            }]);

        if (insertError) {
            console.error('Erro ao inserir produto no Supabase:', insertError);
            return response.status(500).json({
                mensagem: "Erro ao cadastrar produto no banco de dados."
            });
        }

        return response.json({
            mensagem: "Produto cadastrado com sucesso!"
        });
    } catch (err) {
        console.error('Exceção ao criar produto:', err);
        return response.status(500).json({
            mensagem: "Erro interno ao cadastrar produto."
        });
    }
}

async function ListarProdutos(request, response) {
    try {
        const { id } = request.params;
        const { texto, categoria, qtdMin, qtdMax, precoMin, precoMax } = request.query;

        // Valida se a loja existe
        const { data: lojas, error: lojaError } = await supabase
            .from('lojas')
            .select('id')
            .eq('id', id);

        if (lojaError || !lojas || !lojas[0]) {
            return response.status(404).json({
                mensagem: "Loja não encontrada"
            });
        }

        // Seleção de colunas com JOIN relacional no PostgREST/Supabase
        const selectCols = categoria
            ? 'id, nome, descricao, preco, quantidade, imagem_url, id_categoria, id_loja, categorias!inner(id, nome)'
            : 'id, nome, descricao, preco, quantidade, imagem_url, id_categoria, id_loja, categorias(id, nome)';

        let query = supabase
            .from('produtos')
            .select(selectCols)
            .eq('id_loja', id);

        // Filtro de texto parcial em nome ou descrição
        if (texto) {
            query = query.or(`nome.ilike.%${texto}%,descricao.ilike.%${texto}%`);
        }

        // Filtro por nome de categoria
        if (categoria) {
            query = query.ilike('categorias.nome', `%${categoria}%`);
        }

        // Filtros de faixa de preço
        if (precoMin) {
            query = query.gte('preco', Number(precoMin));
        }
        if (precoMax) {
            query = query.lte('preco', Number(precoMax));
        }

        // Filtros de faixa de quantidade em estoque
        if (qtdMin) {
            query = query.gte('quantidade', Number(qtdMin));
        }
        if (qtdMax) {
            query = query.lte('quantidade', Number(qtdMax));
        }

        const { data: produtosRaw, error: prodError } = await query.order('id', { ascending: true });

        if (prodError) {
            console.error('Erro ao listar produtos no Supabase:', prodError);
            return response.status(500).json({
                mensagem: "Erro ao consultar produtos no banco de dados."
            });
        }

        // Formatação garantindo a mesma estrutura esperada pelo front-end
        const produtos = (produtosRaw || []).map(p => ({
            id: p.id,
            nome: p.nome,
            descricao: p.descricao,
            preco: Number(p.preco),
            quantidade: Number(p.quantidade),
            imagem_url: p.imagem_url,
            id_categoria: p.id_categoria,
            id_loja: p.id_loja,
            nome_categoria: p.categorias ? p.categorias.nome : null
        }));

        return response.json({ produtos });
    } catch (err) {
        console.error('Exceção ao listar produtos:', err);
        return response.status(500).json({
            mensagem: "Erro interno ao listar produtos."
        });
    }
}

async function BuscarProdutoPorId(request, response) {
    const { id } = request.params;
    try {
        const { data: produtosRaw, error } = await supabase
            .from('produtos')
            .select(`
                id,
                nome,
                descricao,
                preco,
                quantidade,
                imagem_url,
                id_categoria,
                id_loja,
                categorias (
                    id,
                    nome
                )
            `)
            .eq('id', id);

        if (error || !produtosRaw || !produtosRaw[0]) {
            return response.status(404).json({ mensagem: "Produto não encontrado!" });
        }

        const p = produtosRaw[0];
        const produto = {
            id: p.id,
            nome: p.nome,
            descricao: p.descricao,
            preco: Number(p.preco),
            quantidade: Number(p.quantidade),
            imagem_url: p.imagem_url,
            id_categoria: p.id_categoria,
            id_loja: p.id_loja,
            nome_categoria: p.categorias ? p.categorias.nome : null
        };

        return response.json({ produto });
    } catch (err) {
        console.error('Exceção ao buscar produto por ID:', err);
        return response.status(500).json({ mensagem: "Erro ao buscar produto." });
    }
}

async function AtualizarProduto(request, response) {
    try {
        const { id } = request.params;
        const {
            nome,
            descricao,
            preco,
            quantidade,
            id_categoria,
            imagem_url
        } = request.body;

        const updateData = {};

        if (id_categoria) {
            const { data: categorias, error: catError } = await supabase
                .from('categorias')
                .select('id')
                .eq('id', id_categoria);

            if (catError || !categorias || !categorias[0]) {
                return response.status(404).json({
                    mensagem: "Categoria não encontrada"
                });
            }
            updateData.id_categoria = Number(id_categoria);
        }

        if (nome !== undefined) updateData.nome = nome;
        if (descricao !== undefined) updateData.descricao = descricao;
        if (preco !== undefined) updateData.preco = Number(preco);
        if (quantidade !== undefined && quantidade !== null) updateData.quantidade = Number(quantidade);
        if (imagem_url !== undefined) updateData.imagem_url = imagem_url;

        const { error: updateError } = await supabase
            .from('produtos')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            console.error('Erro ao atualizar produto no Supabase:', updateError);
            return response.status(500).json({
                mensagem: "Erro ao atualizar produto no banco de dados."
            });
        }

        return response.json({
            mensagem: "Produto atualizado com sucesso!"
        });
    } catch (err) {
        console.error('Exceção ao atualizar produto:', err);
        return response.status(500).json({
            mensagem: "Erro interno ao atualizar produto."
        });
    }
}

async function ExcluirProduto(request, response) {
    try {
        const { id } = request.params;

        const { data: produto, error: findError } = await supabase
            .from('produtos')
            .select('id')
            .eq('id', id);

        if (findError || !produto || !produto[0]) {
            return response.status(404).json({
                mensagem: "Produto não encontrado!"
            });
        }

        const { error: deleteError } = await supabase
            .from('produtos')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Erro ao excluir produto no Supabase:', deleteError);
            return response.status(500).json({
                mensagem: "Erro ao excluir produto no banco de dados."
            });
        }

        return response.json({
            mensagem: "Produto excluído com sucesso!"
        });
    } catch (err) {
        console.error('Exceção ao excluir produto:', err);
        return response.status(500).json({
            mensagem: "Erro interno ao excluir produto."
        });
    }
}

async function UploadImagem(request, response) {
    if (!request.file) {
        return response.status(400).json({
            mensagem: "Nenhum arquivo enviado."
        });
    }

    const host = request.get('host');
    const protocol = request.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${request.file.filename}`;

    return response.json({
        mensagem: "Upload realizado com sucesso!",
        imagem_url: fileUrl,
        filename: request.file.filename
    });
}

export {
    CriarProduto,
    ListarProdutos,
    BuscarProdutoPorId,
    AtualizarProduto,
    ExcluirProduto,
    UploadImagem
};
