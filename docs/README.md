# 📁 Estrutura de Pastas - Doxologos

Este documento descreve a organização dos arquivos no projeto Doxologos após a reestruturação.

## 📂 Estrutura Principal

```
frontend_doxologos/
├── 📄 Arquivos de Configuração Raiz
│   ├── package.json              # Dependências e scripts
│   ├── vite.config.js           # Configuração Vite
│   ├── tailwind.config.js       # Configuração Tailwind
│   ├── postcss.config.js        # Configuração PostCSS
│   └── index.html               # Template HTML principal
│
├── 📚 docs/                     # Documentação
│   ├── ACCESSIBILITY_IMPROVEMENTS.md
│   ├── DATABASE_STRUCTURE.md
│   ├── GA4_SETUP_GUIDE.md
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── MONITORING_SYSTEM.md
│   └── USERS_GUIDE.md
│
├── 🗄️ database/                 # Scripts de Banco de Dados
│   ├── migrations/              # Scripts de migração
│   │   ├── create_reviews_table.sql
│   │   ├── add_direct_fields_to_reviews.sql
│   │   └── insert_sample_reviews.sql
│   └── scripts/                 # Scripts utilitários
│       ├── diagnose_bookings_table.sql
│       ├── diagnose_reviews_table.sql
│       ├── supabase_add_valor_consulta.sql
│       ├── supabase_setup_storage.sql
│       ├── supabase_update_availability.sql
│       └── supabase_update_professionals.sql
│
├── 📊 analytics/                # Arquivos de Analytics
│   ├── ga4-setup-report.json
│   └── ga4-validation.js
│
├── ⚡ src/                      # Código Fonte Principal
│   ├── components/              # Componentes React
│   ├── pages/                   # Páginas da aplicação
│   ├── hooks/                   # Custom hooks
│   ├── lib/                     # Bibliotecas e utilitários
│   ├── contexts/                # Context providers
│   └── config/                  # Configurações
│
├── 🔧 config/                   # Configurações de Ambiente
│   └── local.env.example        # Exemplo de variáveis de ambiente
│
├── 📦 supabase/                 # Configurações Supabase
│   └── functions/               # Edge Functions
│
├── 🛠️ tools/                    # Ferramentas de Build
│   ├── deploy.mjs
│   ├── setup-ga4.mjs
│   └── outros scripts...
│
├── 🔌 plugins/                  # Plugins Vite
│   └── vite-plugin-*
│
├── 🧪 temp/                     # Arquivos Temporários/Teste
│   ├── create-test-user.js
│   ├── test-user.js
│   └── test-admin-function.js
│
└── 📜 scripts/                  # Scripts de Build
    └── build-production.sh
```

## 🎯 Benefícios da Nova Organização

### ✅ **Organização Clara**
- Cada tipo de arquivo tem sua pasta específica
- Documentação centralizada em `/docs`
- Scripts de banco separados por tipo

### ✅ **Manutenção Facilitada**
- Fácil localização de arquivos
- Separação entre código, docs e utilitários
- Estrutura escalável

### ✅ **Deploy Limpo**
- Arquivos temporários isolados em `/temp`
- Configurações organizadas
- Build files separados

## 🔍 Onde Encontrar Cada Tipo de Arquivo

| Tipo de Arquivo | Localização | Exemplo |
|-----------------|-------------|---------|
| 📚 Documentação | `/docs/` | USERS_GUIDE.md |
| 🗄️ SQL Migrations | `/database/migrations/` | create_reviews_table.sql |
| 🛠️ SQL Scripts | `/database/scripts/` | diagnose_bookings_table.sql |
| 📊 Analytics | `/analytics/` | ga4-setup-report.json |
| 🧪 Testes/Temp | `/temp/` | test-user.js |
| ⚙️ Configs | `/config/` | local.env.example |

## 🚀 Próximos Passos

1. **Atualizar imports** se houver referências hardcoded
2. **Atualizar documentação** com novos caminhos
3. **Configurar .gitignore** para ignorar `/temp/` se necessário
4. **Atualizar scripts** de build se referenciarem arquivos movidos

---
*Estrutura atualizada em: 26 de Outubro de 2025*