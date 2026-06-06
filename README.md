# TaskInsight Frontend

🚀 **Status**: Projeto em desenvolvimento

## 📋 Sobre o Projeto

TaskInsight é uma aplicação web moderna para gerenciamento de tarefas e produtividade. O frontend é construído com as mais recentes tecnologias do ecossistema React/Next.js, proporcionando uma experiência de usuário fluida e responsiva.

### 🎯 Objetivos

- ✅ Sistema de autenticação seguro (login/registro)
- ✅ Dashboard intuitivo para gerenciamento de tarefas
- ✅ Análise de produtividade
- ✅ Suporte multilíngue (i18n)

## 🛠 Tecnologias Utilizadas

| Tecnologia       | Versão | Propósito                                                 |
| ---------------- | ------ | --------------------------------------------------------- |
| **Next.js**      | 16.2.6 | Framework React com renderização no servidor e roteamento |
| **React**        | 19.2.4 | Biblioteca UI para componentes interativos                |
| **TypeScript**   | 5.x    | Tipagem estática para maior segurança                     |
| **Tailwind CSS** | 4.x    | Estilização utilitária responsiva                         |
| **ESLint**       | 9.x    | Linter para qualidade de código                           |

## 📁 Estrutura do Projeto

```
src/
├── app/                      # Rotas e layouts (Next.js App Router)
│   ├── layout.tsx           # Layout principal
│   ├── page.tsx             # Página inicial
│   ├── globals.css          # Estilos globais
│   ├── (auth)/              # Grupo de rotas de autenticação
│   │   ├── login/page.tsx   # Página de login
│   │   └── register/page.tsx # Página de registro
│   └── dashboard/page.tsx   # Página do dashboard
├── lib/
│   └── i18n.ts             # Configuração de internacionalização
├── services/               # Serviços e APIs
│   ├── auth.service.ts     # Autenticação
│   ├── task.service.ts     # Gerenciamento de tarefas
│   └── analytics.service.ts # Análise de dados
└── types/                  # Tipos TypeScript
    ├── auth.ts            # Tipos de autenticação
    ├── task.ts            # Tipos de tarefas
    ├── analytics.ts       # Tipos de analytics
    └── user.ts            # Tipos de usuário
```

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+ instalado
- npm, yarn, pnpm ou bun

### Instalação

1. **Clone o repositório**

```bash
git clone https://github.com/taskinsight-squad-2/taskinsight-frontend
cd taskinsight-frontend
```

2. **Instale as dependências**

```bash
npm install
# ou
yarn install
# ou
pnpm install
# ou
bun install
```

### Desenvolvimento

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse [http://localhost:3000] em seu navegador.

O aplicativo será recarregado automaticamente ao fazer alterações nos arquivos.

## 📝 Convenções de Código

### Organização de Arquivos

- ✅ Mantenha `src/app/` limpo: apenas `page.tsx` (rotas) e `layout.tsx` (layouts)
- ✅ Componentes reutilizáveis devem ir em `src/components/` (será criado conforme necessário)
- ✅ Use imports absolutos com `@` (ex: `@/services/auth.service.ts`)

### Componentes React

- ✅ **Server Components por padrão**: No App Router, todos os componentes são Server Components
- ✅ **Client Components**: Adicione `"use client";` no topo do arquivo se precisar usar hooks (useState, useEffect, etc.)

### Tipagem

- ✅ Todos os arquivos TypeScript devem ter tipagem completa
- ✅ Defina tipos em `src/types/` para reutilização

## 🔌 Integração com Backend

O projeto está estruturado para integração com duas API backend. Os serviços em `src/services/` devem fazer chamadas HTTP para:

- `/api/auth` - Autenticação e autorização
- `/api/tasks` - Operações com tarefas
- `/api/analytics` - Dados de análise

**Nota**: Endpoints ainda não estão implementados. Configure as URLs base conforme necessário.

## 🌐 Internacionalização

O projeto inclui suporte a múltiplos idiomas via `src/lib/i18n.ts`. Adicione traduções conforme o projeto evolua.

## ⚠️ Avisos Importantes

- 🚧 **Projeto em Desenvolvimento**: Muitos componentes e funcionalidades ainda não estão implementados
- 🔒 **Segurança**: Este é um frontend. A lógica de segurança crítica deve estar no backend
- 📡 **API**: Configure o endpoint da API antes de usar os serviços em produção

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b seunome-frontend`)
2. Commit suas mudanças (`git commit -m 'Add nova funcionalidade'`)
3. Push para a branch (`git push origin seunome-frontend`)
4. Abra um Pull Request

## 📚 Recursos Úteis

- [Documentação Next.js](https://nextjs.org/docs) - Aprenda sobre Next.js
- [Documentação React](https://react.dev) - Referência React
- [Tailwind CSS](https://tailwindcss.com/docs) - Guia de estilização
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Tipagem em TypeScript

**Última atualização**: Junho de 2026 | **Versão**: 0.1.0 (desenvolvimento)
