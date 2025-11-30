# Mapa Operacional de Benefícios
Ferramenta interativa para mapeamento, revisão e análise operacional dos processos de benefícios (AS IS / TO BE), com autosave, indicadores em tempo real e exportação.

---

# 1. Visão Geral do Sistema

O Mapa Operacional de Benefícios é uma aplicação 100% client-side criada para suportar o time de RH/DP no mapeamento e melhoria dos processos de benefícios.

Ele permite:
- Mapear processos AS IS (estado atual)
- Projetar o TO BE (estado futuro ideal)
- Medir impacto operacional automaticamente
- Controlar indicadores (BI Geral e BI Individual)
- Salvar toda a base automaticamente no navegador
- Exportar e importar dados em TXT
- Operar offline sem backend

A proposta é oferecer uma ferramenta ágil e segura para reduzir retrabalho, aumentar padronização e dar suporte à tomada de decisão em RH/DP.

---

# 2. Arquitetura Técnica

A aplicação é composta por três arquivos:

- **index.html** — Estrutura visual da interface
- **style.css** — Layout, cores, identidades e responsividade
- **script.js** — Lógica do sistema, BI, autosave, impacto, exportação

Nenhuma instalação adicional é necessária.

### Ordem de carregamento da base de dados:
1. Base salva no navegador (localStorage)
2. Arquivo `beneficios_db.txt` (se existir)
3. Base embutida no HTML
4. Caso não exista nenhuma, inicia vazia

Esse fluxo evita perda de dados.

---

# 3. Fluxo Completo do Sistema

Ao abrir a página, acontecem as etapas:

1. `carregarBanco()` localiza e carrega os dados
2. O sistema normaliza AS IS e TO BE como textos
3. Todos os cards de benefícios são renderizados
4. O BI geral é calculado
5. O BI individual é carregado
6. O editor (AS IS e TO BE) aguarda seleção
7. Autosave permanece ativo

Tudo sem recarregar a página.

---

# 4. Métodos e Funcionamento Interno

A seguir, um detalhamento de todos os métodos da aplicação.

## 4.1. carregarBanco()
- Tenta carregar a base do localStorage
- Se falhar, tenta ler `beneficios_db.txt`
- Se ainda falhar, usa o JSON embutido
- Converte dados para string
- Salva base novamente no localStorage
- Atualiza cards, BI e detalhes

É o método central de inicialização.

---

## 4.2. salvarBanco()
Garante que AS IS e TO BE sejam sempre salvos como **string**, evitando erros estruturais.

Esse método:
- Padroniza os dados
- Converte arrays em texto
- Salva tudo no localStorage
- É chamado por vários módulos

---

## 4.3. autosaveEditor()
Chamado automaticamente a cada digitação.

Responsável por:
- Capturar texto do AS IS e TO BE
- Atualizar o item correto da base
- Enviar para o localStorage imediatamente
- Atualizar o BI em tempo real

O sistema não perde dados em hipótese alguma.

---

## 4.4. montarCards()
Cria dinamicamente os cards de cada benefício, contendo:
- Nome
- Categoria
- Quantidade de ações AS IS
- Impacto calculado
- Classe visual do impacto

Ao clicar em um card:
- Ele é marcado como ativo
- O editor AS IS e TO BE é preenchido
- O autosave fica ligado

---

## 4.5. marcarCardAtivo()
Aplica estilo visual ao card selecionado:

- borda azul
- fundo levemente destacado

O usuário sempre sabe qual benefício está editando.

---

## 4.6. abrirEditor()
Carrega no painel central:
- Impacto AS IS
- Caixa de texto AS IS
- Caixa de texto TO BE
- Eventos de autosave

Todo o ciclo de edição ocorre aqui.

---

## 4.7. atualizarBI()
Calcula os indicadores globais:

- **Redução de retrabalho:** total AS IS
- **Tempo Operacional:** AS IS × 0,6
- **Confiabilidade:** TO BE × 0,3
- **SLA:** TO BE × 0,5
- **Ganho AS IS × TO BE:** TO BE – AS IS

Essa visão é usada para medir impacto geral.

---

## 4.8. BI Individual
Cada benefício possui indicadores próprios:
- Tempo operacional (h/mês)
- Retrabalho (%)
- SLA (dias)
- Confiabilidade (%)

Armazenados no localStorage no objeto:
`biIndicadores_beneficiosV8`

---

## 4.9. Exportar / Importar / Resetar
- **Exportar:** cria um TXT JSON com toda a base
- **Importar:** lê um arquivo TXT e recarrega tudo
- **Salvar TXT:** snapshot automático da base
- **Resetar:** limpa tudo e recarrega do zero

---

# 5. Impacto Operacional (AS IS)

O impacto é calculado pelo número de linhas do AS IS.

| Linhas AS IS | Impacto |
|--------------|----------|
| 0            | Zero |
| 1–7          | Leve |
| 8–14         | Moderado |
| 15–22        | Alto |
| 23+          | Muito alto |

Esse modelo permite medir esforço manual.

---

# 6. Funcionamento do Autosave

O autosave é instantâneo e permanente:

- Não depende de botões
- Não exige salvar manual
- Persistência total mesmo após fechar a aba
- Zero risco de perda

A base fica no navegador dentro da chave:
`beneficiosDB_final_V8`

---

# 7. Segurança e Privacidade

O sistema:
- Não envia dados para servidor
- Não usa backend
- Não exige internet
- Armazena somente no navegador local

É compatível com ambientes restritos de RH/DP.

---

# 8. Benefícios da Arquitetura

- Funciona offline
- Sem dependência de sistema externo
- Simples de implementar em equipes
- Fácil expansão futura
- Pode exportar para Power BI
- Pode evoluir para API/Flask no futuro

---

# 9. Roadmap Futuro

Possíveis módulos adicionais:
- Exportação Excel (.xlsx)
- Dashboard visual em Power BI
- Geração de PDF automática
- Gráficos comparativos
- Clusterização de AS IS
- Integração com ADP/SuccessFactors

---

# 10. Autor

Projeto realizado no contexto do Igarapé Digital.

**Anderson Marinho**  
Especialista em RH/DP, BI e Automação  
