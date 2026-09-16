require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setRole() {
    const email = 'aenderborba@gmail.com';
    console.log(`Buscando usuário: ${email}`);

    let user = null;
    let page = 1;
    let hasMore = true;
    while(hasMore) {
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 100
        });
        if (usersError) {
            console.error("Erro listando usuários:", usersError);
            return;
        }
        const found = usersData.users.find(u => u.email === email);
        if (found) {
            user = found;
            break;
        }
        if (usersData.users.length < 100) {
            hasMore = false;
        }
        page++;
    }

    if (!user) {
        console.error("Usuário não encontrado em nenhuma página.");
        return;
    }

    console.log(`Usuário encontrado! ID: ${user.id}`);
    console.log("Metadados atuais:", user.app_metadata);

    // Atualizar app_metadata
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { app_metadata: { role: 'professional' } }
    );

    if (updateError) {
        console.error("Erro ao atualizar role:", updateError);
        return;
    }

    console.log("Role atualizada com sucesso para 'professional' no auth.users!");
}

setRole();
