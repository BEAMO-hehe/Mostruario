import supabase from '../db/config.js';

async function ListarTodasLojas(request, response) {
    try {
        const { data: lojas, error } = await supabase
            .from('lojas')
            .select('id, nome, descricao, imagem_url, id_usuario')
            .order('id', { ascending: true });

        if (error) {
            console.error('Erro ao listar lojas no Supabase:', error);
            return response.status(500).json({ mensagem: "Erro ao buscar lojas." });
        }

        return response.json({ lojas: lojas || [] });
    } catch (err) {
        console.error('Exceção ao listar lojas:', err);
        return response.status(500).json({ mensagem: "Erro interno ao buscar lojas." });
    }
}

async function BuscarLojaPorId(request, response) {
    const { id } = request.params;
    try {
        const { data: lojas, error } = await supabase
            .from('lojas')
            .select('id, nome, descricao, imagem_url, id_usuario')
            .eq('id', id);

        if (error || !lojas || !lojas[0]) {
            return response.status(404).json({ mensagem: "Loja não encontrada." });
        }

        return response.json({ loja: lojas[0] });
    } catch (err) {
        console.error('Exceção ao buscar loja por ID:', err);
        return response.status(500).json({ mensagem: "Erro interno ao buscar loja." });
    }
}

async function BuscarLojasDoUsuario(request, response) {
    const { id } = request.params;

    try {
        const { data: usuarios, error: userError } = await supabase
            .from('usuarios')
            .select('id')
            .eq('id', id);

        if (userError || !usuarios || !usuarios[0]) {
            return response.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        const { data: lojas, error } = await supabase
            .from('lojas')
            .select('id, nome, descricao, imagem_url')
            .eq('id_usuario', id)
            .order('id', { ascending: true });

        if (error) {
            console.error('Erro ao buscar lojas do usuário:', error);
            return response.status(500).json({ mensagem: "Erro ao buscar lojas do usuário." });
        }

        return response.json({
            lojas: lojas || []
        });
    } catch (err) {
        console.error('Exceção ao buscar lojas do usuário:', err);
        return response.status(500).json({ mensagem: "Erro interno ao buscar lojas do usuário." });
    }
}

export { ListarTodasLojas, BuscarLojaPorId, BuscarLojasDoUsuario };
