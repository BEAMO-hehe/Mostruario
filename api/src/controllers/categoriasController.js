import supabase from '../db/config.js';

async function ListarCategorias(request, response) {
    try {
        const { data: categorias, error } = await supabase
            .from('categorias')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Erro ao listar categorias no Supabase:', error);
            return response.status(500).json({
                mensagem: "Erro ao buscar categorias."
            });
        }

        return response.json({
            categorias: categorias || []
        });
    } catch (err) {
        console.error('Exceção ao listar categorias:', err);
        return response.status(500).json({
            mensagem: "Erro interno ao processar listagem de categorias."
        });
    }
}

async function CriarCategoria(request, response) {
    try {
        const { nome } = request.body;

        if (!nome || !nome.trim()) {
            return response.status(400).json({
                mensagem: "O nome é obrigatório"
            });
        }

        const { data, error } = await supabase
            .from('categorias')
            .insert([{ nome: nome.trim() }])
            .select();

        if (error) {
            console.error('Erro ao criar categoria no Supabase:', error);
            return response.status(500).json({
                mensagem: "Erro ao criar categoria."
            });
        }

        return response.json({
            messagem: "Categoria cadastrada com sucesso!",
            mensagem: "Categoria cadastrada com sucesso!",
            categoria: data && data[0]
        });
    } catch (err) {
        console.error('Exceção ao criar categoria:', err);
        return response.status(500).json({
            mensagem: "Erro interno ao cadastrar categoria."
        });
    }
}

async function DeletarCategoria(request, response) {
    try {
        const { id } = request.params;

        const { error } = await supabase
            .from('categorias')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar categoria no Supabase:', error);
            return response.status(500).json({
                mensagem: "Erro ao deletar categoria. Verifique se existem produtos associados."
            });
        }

        return response.json({
            mensagem: `A categoria com o id ${id} foi removida com sucesso!`
        });
    } catch (err) {
        console.error('Exceção ao deletar categoria:', err);
        return response.status(500).json({
            mensagem: "Erro interno ao deletar categoria."
        });
    }
}

async function AtualizarCategoria(request, response) {
    try {
        const { id } = request.params;
        const body = request.body;

        if (!body.nome || !body.nome.trim()) {
            return response.status(400).json({
                mensagem: "O nome é obrigatório"
            });
        }

        const { error } = await supabase
            .from('categorias')
            .update({ nome: body.nome.trim() })
            .eq('id', id);

        if (error) {
            console.error('Erro ao atualizar categoria no Supabase:', error);
            return response.status(500).json({
                mensagem: "Erro ao atualizar categoria."
            });
        }

        return response.json({
            mensagem: "A categoria foi atualizada com sucesso!"
        });
    } catch (err) {
        console.error('Exceção ao atualizar categoria:', err);
        return response.status(500).json({
            mensagem: "Erro interno ao atualizar categoria."
        });
    }
}

export { ListarCategorias, CriarCategoria, DeletarCategoria, AtualizarCategoria };
