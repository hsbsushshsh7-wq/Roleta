# Validação executada — 21/10/2026

## Resultado

| Verificação | Resultado observado |
| --- | --- |
| `npm run typecheck` | Passou, TypeScript estrito e `noUncheckedIndexedAccess` |
| `npm run lint` | Passou, sem erros ou avisos na execução final |
| `npm test` | 99 testes passaram, sete arquivos |
| `NODE_USE_ENV_PROXY=1 npx expo-doctor` | 20/20 verificações passaram |
| `npx expo install --check` | Dependências compatíveis com Expo SDK 55 |
| `npx expo prebuild --platform android --no-install` | Projeto Android gerado sem erro; não compila um APK |
| `npx expo export --platform all --output-dir dist/release` | Bundles web, Android/Hermes e iOS/Hermes exportados |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | Quinze fluxos passaram na execução final |
| `npx eas whoami` | “Not logged in” |
| APK | Gerado localmente com `assembleRelease`; assinatura, alinhamento de 16 KB, CRC e recursos embutidos verificados |
| AAB / IPA | Não gerados |
| Emulador ou dispositivo nativo | APK não executado em dispositivo/emulador; SDK e NDK instalados para compilação local |
| FPS Android / vibração física / compartilhamento em aparelho | Não medidos em dispositivo |

O `expo-doctor` inicialmente precisou de `NODE_USE_ENV_PROXY=1` para consultar os serviços externos pela rede deste ambiente. Uma dependência transitiva incorreta (`expo-asset` 58 em SDK 55) foi corrigida pela instalação explícita da versão compatível. O EAS CLI foi retirado das dependências locais conforme orientação do Doctor; os comandos de build usam `npx eas-cli@25.2.0`.

## Cobertura de lógica e integração

Na preparação do remake, Expo Doctor identificou patches novos do SDK 55. Expo 55.0.32, expo-dev-client 55.0.41 e expo-sharing 55.0.25 foram instalados pelo Expo CLI, seguidos por nova execução completa dos checks e fluxos.

Os testes verificam amostragem sem viés de módulo, rejeição da cauda aleatória, extremos e intervalos inválidos, alinhamento de todos os índices em roletas de 1, 2, 4, 10, 13, 24, 400, 720, 721 e 10.000 opções, giros sucessivos e exclusão de todos os índices já sorteados.

Também verificam intervalos negativos e grandes sem arrays, zero, percentuais exatos, análise de separadores e Unicode, listas de 400 e 50.000 entradas, isolamento das cinco modalidades, preenchimento e conclusão de fichas, alvo manual, edição de categorias preservando IDs, prevenção de sobrescrita, serialização de salvamentos, recuperação por backup e rejeição de JSON inválido ou incompatível.

Testes adicionais verificam edição independente de pesos e normalização mantendo 100% real, pesos zero/100%, alinhamento ponderado até Number.MAX_SAFE_INTEGER, esgotamento sem depender do histórico limitado, isolamento de fontes, snapshots das cinco modalidades, migração dos dados anteriores e rejeição de distribuições inválidas.

Seis testes de transferência simulam os serviços nativos para verificar chamadas de compartilhamento, retenção do arquivo exportado para leitura pelo aplicativo destinatário, limpeza de cache antigo, cancelamento de importação e validação antes de retornar dados. Esses testes usam mocks; não substituem um teste de integração em Android/iOS.

Um teste detectou e levou à correção de arredondamento em `index / count * displayCount` para índices como 29/400. O motor agora usa identidade para contagens iguais e divisão inteira exata em grupos condensados. Nenhum índice real é deduzido da posição animada: o resultado único determina o ângulo e a ficha.

## Fluxos de interface executados no Chromium

1. Números, negativos e zero, porcentagem com passo 0,25%, palavras e poderes personalizados; recuperação após recarregar e isolamento das configurações.
2. Elenco de **400 nomes sintéticos de teste**, duas fichas, avanço automático, conclusão das oito categorias e reinício de somente uma ficha.
3. Renomear/reordenar categorias preenchidas e adicionar categoria sem perder o resultado vinculado ao ID.
4. Exportar JSON, mudar uma preferência e importar o arquivo para restaurar o estado anterior.
5. Capturas e ausência de transbordamento horizontal em larguras 320, 390, 578 e 834 pixels.
6. Validação de intervalo invertido e bloqueio contra sorteios simultâneos.
7. Confirmação acima do editor ao remover uma categoria preenchida.
8. Predefinições: salvar chances e não repetição, restaurar após reabrir, carregar, substituir mediante confirmação e excluir sem afetar outra.
9. Pop-up: valor igual ao histórico, Girar novamente, fechar por toque externo e não reabrir ao reiniciar.
10. Não repetição: bloqueio de todos os resultados após reabrir, esgotamento informado e RESET.
11. Editor de chances: elenco de 400 opções, somente 20 inputs por página, busca e normalização de pesos.
12. Pesos 90/30 permanecem independentes e mostram 75%/25%; paleta, cor HEX e título sobrevivem ao salvamento em predefinição e recarga.
13. Lote sem repetição, esgotamento sem gravação parcial e recuperação após recarga.
14. Equipes equilibradas com cada participante uma vez; modelo rápido preserva lista anterior.
15. Modo foco e pop-up opcional persistem; layout sem transbordamento em larguras 320, 390 e 834.

A importação inicialmente encontrou uma confirmação atrás das preferências. Isso foi corrigido usando um host com uma única `Modal` nativa e uma pilha de painéis. Os testes de importação e remoção de categoria passaram com a correção.

## Comparação visual

As cinco referências iniciais e as quatro referências adicionais (predefinições, CFG, distribuição e resultado) foram examinadas. As capturas finais abaixo foram abertas e inspecionadas em comparação com elas: fundo claro com rosa/lavanda, cartões brancos arredondados, paleta roxa, cabeçalhos, editor, seleção lilás, progresso em gradiente, borda branca da roleta, ponteiro à direita e divisões estreitas no caso de 400 entradas.

- [Tela numérica](numbers-mobile.png)
- [Configuração do intervalo](numbers-config-mobile.png)
- [Seletor de modalidades](modes-mobile.png)
- [Ficha de personagem](creator-mobile.png)
- [Roleta de 400 entradas — fixture de teste](creator-wheel-400-fixture.png)
- [Editor do elenco parcial disponível](roster-editor-mobile.png)
- [Predefinições — dados criados pelo teste, sem exemplos instalados](presets-mobile.png)
- [CFG e editor de chances](chances-mobile.png)
- [Pop-up do resultado numérico](result-mobile.png)
- [Pop-up com frase da referência em fixture descartável](result-words-mobile.png)
- [Editor de pesos independentes](remake-weights.png)
- [Cores por fatia](remake-colors.png)
- [Sorteio em lote](remake-batch.png)
- [Equipes](remake-teams.png)
- [Modelos](remake-templates.png)
- [Modo foco](remake-focus.png)

As capturas são da renderização web dos componentes React Native, não de emulador Android. Não houve comparação automatizada de pixels nem aprovação visual do usuário. A captura com 400 entradas usa nomes `Fixture` somente no teste, que não fazem parte dos dados instalados. O relatório bruto dos quinze testes está em `e2e-results.json`.

## Limites de entrega

A aplicação funciona com dados inseridos pelo usuário, porém a fidelidade integral ao site não pode ser confirmada: o código, os 400 nomes, a lista padrão de poderes e a nona categoria permanecem inacessíveis. A precisão percentual continua documentada como decisão da implementação. As chances da versão 2.0 seguem explicitamente o pedido de pesos independentes; o restante da personalização está documentado em REMAKE-RESEARCH.md. Os dados iniciais não foram apresentados como equivalentes ao original.

O primeiro APK 1.0.0 foi compilado localmente, sem conta Expo. A atualização 2.0.0 foi compilada em 4 min 10 s e usa o mesmo processo com `npm run build:apk:local`, JDK 17, SDK 36 e duas ABIs ARM. Com JDK 21, o resolver legado de toolchains do React Native falhava em `JvmVendorSpec.IBM_SEMERU`.

Os metadados e verificações do APK atualizado constam em `APK-BUILD.json`, `APK-SIGNATURE.txt` e `APK-METADATA.txt`: pacote, versão/código, tamanho, SHA-256, assinatura, alinhamento de 16 KB, integridade ZIP, bundle e áudio embutidos e ausência de debuggable. A assinatura usa o certificado Android de testes, mantido em relação ao APK anterior.

A compilação e a verificação estrutural não substituem testes de instalação, execução e FPS em dispositivo real, que não foram realizados. Builds em nuvem e distribuição em loja continuam exigindo sua conta Expo e credenciais próprias de assinatura.

O APK Remake tem 45.225.975 bytes, versão 2.0.0/código 3. A assinatura foi comparada à da versão 1.1.0 e é idêntica. Bundle Hermes, WAV, duas ABIs ARM, CRC e alinhamento de 16 KB foram verificados.
