# Análise da fonte e das referências

## Material disponível

O workspace foi examinado antes da implementação. Não havia repositório, páginas, CSS, componentes, regras ou listas. As pastas `shared`, `scratch` e `library-files` estavam vazias.

As cinco imagens fornecidas foram abertas e examinadas:

| Imagem | Evidência |
| --- | --- |
| 39871 | Editor de elenco, vírgulas como separadores, contador 400, botão Atualizar elenco, explicação do avanço e botão Girar agora |
| 39868 | Seletor com cinco modalidades, seleção lilás, ponteiro direito, hub central e último resultado |
| 39870 | Elenco atual com 400 fatias estreitas, roleta multicolorida, cartão de resultado e editor |
| 39867 | Intervalo com Começa em e Termina em, chances iguais e condensação visual em intervalos enormes |
| 39869 | Fichas P1, 9 categorias declaradas, destaque ativo lilás, progresso e oito nomes legíveis |

Nomes legíveis: Goku, Vegeta, Gohan, Piccolo, Trunks, Goten, Bulma, Kuririn e Freeza (parcialmente visível). Categorias confirmadas: Força, Velocidade, Resistência, Inteligência, QI de batalha, Corpo, Poder 1 e Poder 2. A nona não aparece. A interface usa apenas as oito conhecidas; não inventa um nome para atingir nove.

## Tentativa de recuperação do site

URL informada: https://roleta-numerica.kitagawazin.chatgpt.site/wheel

A requisição retornou a página de acesso “Sign in required”, em vez da aplicação. O HTML está em `original-access-response.html` para documentar o bloqueio. As consultas autenticadas do conector Sites, como proprietário e como editor, retornaram listas vazias. Nenhum site foi alterado, publicado ou criado pelo conector.

Não há código original disponível para validar funcionalidades ocultas. A implementação não pode ser considerada uma migração completa e fiel do original enquanto esse material estiver indisponível.

## O que requer a fonte original

- Lista exata dos 400 personagens e a lista integral de poderes.
- Nona categoria e eventuais categorias/regras não mostradas.
- Precisão e granularidade de porcentagem.
- Ordem de preenchimento entre fichas/categorias, além do avanço sequencial mostrado.
- Eventuais recursos extras não documentados nas imagens.
- Formatos antigos de importação/exportação e compatibilidade com salvamentos web.
- Regras adicionais não visíveis.

As novas referências 40227–40229 confirmam predefinições nomeadas, chances por opção mantendo total de 100%, Igualar, não repetição e RESET. A referência 40239 confirma o pop-up de resultado com fechar e Girar novamente. Essas funcionalidades foram implementadas na versão 1.1.0. Os exemplos de predefinições das capturas não são dados iniciais.

Entradas começam com chances iguais; pesos personalizados são opcionais e independentes por modalidade. Percentuais permitem passo configurável; backups usam o schema versionado deste aplicativo; o histórico é uma adição local. O código original permanece indisponível para confirmar detalhes além das imagens.

## Integrar os dados recuperados

Para uso imediato, cole o elenco e os poderes nos respectivos editores e aplique. “Definir lista atualizada como padrão” guarda a lista aplicada como referência de restauração. No criador, adicione a categoria original pelo editor.

Para distribuição com os dados já incluídos, substitua a fonte de `src/data/defaults.ts` pelas listas recuperadas e documente a procedência. Atualize a identificação de elenco parcial em `Configuration.tsx`, que atualmente compara a lista aplicada com os nove nomes visíveis na captura. Preserve IDs de categorias existentes para manter resultados vinculados. O aplicativo instalado com dados anteriores não deve sobrescrever listas editadas silenciosamente: planeje uma migração de schema ou ofereça importação explícita.

Antes de declarar equivalência, compare as regras recuperadas com os motores `options.ts`, `characters.ts` e `draw.ts`, adapte a importação antiga e repita os testes. As capturas, isoladamente, não bastam para confirmar regras de negócio ausentes.

## Remake 2.0

O pedido posterior autoriza mudanças criativas e substitui o comportamento de redistribuição automática: o editor passa a guardar pesos independentes. A chance real é calculada pela proporção de cada peso no total; nenhuma edição reescreve as outras opções. As cores, ferramentas e modelos novos são recursos desta versão, identificados como tais. A migração dos documentos e snapshots mantém as probabilidades anteriores, os elencos personalizados e todas as fichas.
