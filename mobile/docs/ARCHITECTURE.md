# Arquitetura

## Sorteio e ponteiro

`getSource` fornece contagem e função de rótulo. Intervalos não criam arrays: mesmo bilhões de números ocupam espaço constante. Números exigem inteiros seguros; percentuais usam centésimos inteiros para evitar deriva de ponto flutuante.

`uniformIndex` usa duas palavras aleatórias de `expo-crypto` para formar 53 bits. Amostras na cauda não divisível do espaço são rejeitadas antes do módulo, evitando viés. O motor aceita um provedor de aleatoriedade injetável para testes e falha explicitamente se não obtiver uma amostra válida.

`planSpin` determina uma vez o índice e o valor real. Até 720 opções, cada entrada corresponde à sua própria fatia. Acima disso, apenas a representação é agrupada: o índice visual usa divisão inteira exata com BigInt. O valor sorteado continua sendo selecionado na fonte integral, com chances iguais ou os pesos configurados. Os grupos condensados podem conter quantidades diferentes de opções e não representam pesos iguais entre grupos. A interface informa essa condensação.

A fatia de índice `i` começa no eixo direito e cresce no sentido horário. O ponteiro é fixo no ângulo zero. O centro entre os limites angulares da fatia é levado ao ponteiro por rotação negativa equivalente, acrescentando sete voltas completas. Com pesos, os limites são cumulativos e proporcionais às chances. O motor entrega o destino; o Reanimated anima uma única view na UI thread em Android/iOS. O callback final aplica o mesmo valor à ficha, ao histórico e ao pop-up de resultado. Não há sorteio durante a animação.

Um bloqueio síncrono impede dois giros mesmo antes de o estado React atualizar. Configurações e navegação de modalidades/fichas ficam bloqueadas durante o giro. Se o app for encerrado durante uma animação, nenhum resultado parcial é gravado. O resultado só é confirmado ao término.

## Renderização

Até 720 fatias são agrupadas por cor em caminhos SVG. As paletas prontas usam no máximo **12 caminhos**; cores manuais podem criar grupos adicionais, limitados ao número de fatias visuais. No elenco de 400, as 400 divisões reais são mantidas. Textos radiais só aparecem até 24 opções. Uma view externa gira o desenho memorizado, sem recalcular geometria a cada frame.

A estratégia limita memória e trabalho de montagem, mas 60 FPS em hardware Android intermediário requer medição em dispositivo real, não realizada nesta sessão.

## Fichas e dados

Cada ficha guarda sua própria cópia das categorias, um mapa de resultados por ID e um alvo opcional. Renomear e reordenar preserva resultados por ID. Remover resultados preenchidos exige confirmação. O usuário pode selecionar uma categoria pendente, reiniciar uma ficha ou toda a sessão.

Novas fichas usam o modelo de categorias atual. Alterar o modelo não altera outras fichas existentes. O histórico mantém até 200 eventos; resultados preenchidos continuam na ficha mesmo que o histórico seja limpo.

Listas, intervalos e regras são independentes entre modalidades. Não repetir mantém índices bloqueados fora do histórico, inclusive após 200 giros e reinício do app. Ao esgotar as opções elegíveis, exige RESET ou mudança de configuração. Atualizar realmente a fonte reinicia apenas as regras de distribuição/bloqueios daquela modalidade. Entradas duplicadas são opções distintas.

## Chances e predefinições

`Distribution` usa peso-base e exceções esparsas por índice: até intervalos de bilhões de valores podem receber ajustes sem materializar arrays. Editar uma chance altera somente o peso daquela opção; os demais valores são preservados. A probabilidade real é peso/soma. Igualar define peso-base 100 e remove exceções. `format: relative` identifica dados novos; pesos legados são convertidos uma vez para sua escala percentual anterior sem alterar as probabilidades. O sorteio ponderado percorre segmentos contíguos e exclui pesos zero e resultados bloqueados. Com pesos iguais, mantém o amostrador inteiro por rejeição. Probabilidades elegíveis são renormalizadas durante a seleção quando não repetir está ativo.

A geometria proporcional é calculada separadamente e não muda ao confirmar um resultado bloqueado. O ponteiro continua alinhado ao resultado do giro concluído. Os editores de pesos e cores compartilham busca e paginação em 20 campos para evitar centenas de inputs montados. Cores customizadas são agrupadas por preenchimento SVG; paletas padrão usam no máximo 12 caminhos. Contraste do texto considera luminância da cor.

Predefinições guardam snapshots clonados da modalidade, fontes, pesos e bloqueios; o criador inclui fichas, categorias e resultados. Carregar uma predefinição preserva todas as outras modalidades. Nomes repetidos exigem confirmação de substituição; excluir a predefinição não exclui a roleta em uso. Nenhum exemplo das imagens é semeado no armazenamento.

## Persistência

Um documento versionado é salvo em AsyncStorage. As gravações são serializadas em fila; um salvamento anterior não termina depois de um novo. Alterações aplicadas disparam autosave após 400 ms, com tentativa adicional em segundo plano. Salvar uma predefinição também força a escrita. Como em qualquer armazenamento assíncrono, um encerramento forçado antes de a gravação terminar pode perder a mudança mais recente.

Antes de substituir um estado válido, a versão anterior é guardada em uma chave de backup. Dados corrompidos não substituem um backup válido. Falhas de leitura bloqueiam edições e autosave até recuperação; o aplicativo não sobrescreve silenciosamente o arquivo ilegível com padrões vazios.

Zod valida schema, limites, intervalos, categorias, IDs, fichas, histórico, preferências, chances e snapshots. A migração aditiva de documentos v1 anteriores preserva os dados e inicializa predefinições vazias; a preferência antiga de repetição e o histórico disponível alimentam as novas regras. Importação valida antes de qualquer substituição e pede confirmação. Exportação usa FileSystem/Sharing no nativo, retendo o arquivo em cache para leitura pelo destinatário e limpando exportações com mais de sete dias na próxima exportação; DocumentPicker lê backups. A versão web usa download/seleção de arquivos do navegador apenas para QA.

## Aparência e acessibilidade

Gradiente rosa/pêssego/lavanda, cartões brancos arredondados, ações roxas, tipografia escura, progresso roxo e categoria ativa lilás seguem as capturas. Há safe areas, teclados adequados, ajuste de teclado, estados pressionados, rótulos de acessibilidade, anúncio de resultado e respeito à preferência de movimento reduzido. Os painéis fecham pelo toque externo e por `onRequestClose` no Android. O pop-up final usa `expo-blur` compatível com SDK 55, BlurTargetView e fundo escurecido; não reaparece ao reiniciar o aplicativo.

Som de resultado está empacotado como WAV, sem downloads. Haptics são opcionais; indisponibilidade não impede o giro. A aplicação não utiliza chamadas de rede para funcionar.


## Ferramentas do remake

`toolbox.ts` usa o mesmo motor de seleção para lotes de até 100 resultados. A validação acontece antes da gravação; resultados de lote são identificados por `tool: batch` no histórico e não substituem a indicação de último giro animado. O criador é excluído do lote para preservar o preenchimento por categoria.

Equipes usam Fisher–Yates com o amostrador uniforme injetável, mantendo cada entrada exatamente uma vez. Os tamanhos diferem no máximo em uma entrada; 20 participantes por página mantêm a renderização limitada. Lotes e equipes ficam em `AppData.toolbox` e entram no backup JSON.

Modelos rápidos salvam a configuração anterior da modalidade de destino em uma predefinição antes de alterar sua fonte. Se não houver espaço para a predefinição, a operação inteira falha sem substituir dados. Todos os comandos continuam locais/offline.


## Laboratório 3.0

`Laboratory` é um campo aditivo independente das regras de roleta. Dados, cartas, ordem, amigo secreto, datas e torneios usam motores puros testáveis. O torneio guarda participantes, seeds e decisões; a chave é derivada e a importação reexecuta as decisões para rejeitar vencedores impossíveis. Embaralhamentos usam Fisher–Yates com índices uniformes; datas usam sua versão parcial. Amigo secreto usa rejeição de permutações completas sem autoatribuições.

Cartas são validadas contra um baralho canônico; estoque e última mão não podem repetir IDs. Dados importados são reexecutados com as faces registradas para validar seleção, soma, modificador e expressão. O temporizador guarda prazo e restante, sem autosave por frame. Ao abrir, recalcula contra o relógio; não agenda tarefas em segundo plano.

Estatísticas identificam opções por sessão, modalidade, índice, contagem e rótulo. Lotes são filtráveis. CSV escapa delimitadores e neutraliza fórmulas. O estúdio aplica alterações por transação: primeiro salva a configuração deslocada, depois troca a lista. Falha de limite de predefinições não aplica parcialmente a lista.

`SheetProvider` mantém as entradas do stack montadas e oculta as não ativas (`display:none`, sem toque/acessibilidade). Isso preserva estados de editores filhos ao sobrepor confirmações e erros, mantendo um único Modal nativo.
