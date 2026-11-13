import supabase from '../db/config.js';

async function Login(request, response) {
    try {
        const { email, senha } = request.body;

        if (!email) {
            return response.status(400).json({
                mensagem: "O email é obrigatório."
            });
        }

        if (!senha) {
            return response.status(400).json({
                mensagem: "A senha é obrigatória."
            });
        }

        // Consulta insensível a maiúsculas/minúsculas no Supabase
        const { data: usuarios, error } = await supabase
            .from('usuarios')
            .select('*')
            .ilike('email', email.trim());

        if (error) {
            console.error('Erro ao consultar usuário no Supabase:', error);
            return response.status(500).json({
                mensagem: "Erro ao consultar usuário no banco de dados."
            });
        }

        const usuario = usuarios && usuarios[0];

        if (!usuario) {
            return response.status(401).json({
                mensagem: "Nenhuma conta foi encontrada para este email;"
            });
        }

        if (String(senha) !== String(usuario.senha)) {
            return response.status(401).json({
                mensagem: "Usuário ou senha incorretos;"
            });
        }

        return response.json({
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (err) {
        console.error('Exceção no controller de Login:', err);
        return response.status(500).json({
            mensagem: "Erro interno do servidor ao processar autenticação."
        });
    }
}

export { Login };
