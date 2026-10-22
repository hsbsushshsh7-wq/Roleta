# Roleta 3.0.0 — desenvolvimento

A Release instalável atual é a [2.0.0](https://github.com/hsbsushshsh7-wq/Roleta/releases/tag/v2.0.0). O código desta proposta inicia a 3.0; não há APK 3.0 publicado. Android versionCode reservado: 4.

## Funcionalidades integradas

- **Laboratório:** catálogo de 12 ferramentas, busca sem acentos e categorias Jogar, Organizar e Explorar.
- **Dados RPG:** 1–30 dados de 2–1.000 faces, modificador, vantagem/desvantagem de D20, detalhamento e compartilhamento.
- **Baralho:** 52 cartas ou 54 com coringas; compra de 1–10 cartas por vez sem reposição; nova partida com confirmação; mão e estoque persistidos.
- **Torneios:** 2–64 participantes, chave aleatória e folgas imparciais, vencedor manual ou 50/50, rodadas, campeão, desfazer último resultado e compartilhamento.
- **Amigo secreto:** 2–200 participantes, sem autoatribuição, identidade por posição, revelação individual e exclusão. Os pares ficam no dispositivo e nos backups; a revelação não oculta dados do organizador.
- **Ordem aleatória:** 2–5.000 entradas, duplicatas preservadas, paginação e compartilhamento.
- **Datas:** 1900–2100, filtros por dia da semana, 1–100 datas sem repetição, anos bissextos e calendário independente do fuso. Última configuração aplicada e resultados persistem.
- **Temporizador:** 1 segundo a 24 horas, pausa, retomada e reinício. Usa prazo persistido e recupera o tempo ao retornar. É visual, sem alarme em segundo plano ou giro automático.
- **Estúdio de listas:** editar Palavras/Poderes/Elenco, separar linhas ou delimitadores, remover duplicatas exatas, ordenar, inverter e embaralhar. A aplicação confirma a mudança e cria backup da configuração anterior nas predefinições.
- **Estatísticas:** filtros de modalidade/sessão e giros/lotes, total, opções distintas, frequência, ranking e compartilhamento CSV. Refletem até os 200 eventos retidos, sem alegar comprovação de justiça estatística.

Modelos, lotes e equipes da 2.0 permanecem no catálogo. As cinco modalidades originais, pesos independentes, cores, fichas e predefinições continuam disponíveis.

## Persistência e integridade

O campo aditivo `lab` recebe valores vazios ao importar ou ler dados da 2.0. Listas, regras, fichas e predefinições antigas são preservadas. Importações validam cartas, estoque, resultados e configuração dos dados, pares, datas, temporizador e o replay do torneio. Backups incluem o laboratório.

O host de painéis mantém formulários montados atrás das confirmações, ocultos para toque e acessibilidade. Cancelar ou receber erro não apaga o rascunho.

## Próxima etapa da distribuição

Validar em aparelho Android: teclado, botão Voltar, compartilhamento e retomada. Depois, compilar e assinar a 3.0 com o mesmo certificado da linha atual e publicar quando a versão estiver pronta. A validação automatizada executada nesta entrega está em VALIDATION.md. O APK 2.0 publicado permanece imutável.
