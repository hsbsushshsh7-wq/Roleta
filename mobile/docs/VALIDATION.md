# Validação — desenvolvimento 3.0.0

Executada em 22/10/2026. O APK disponível na Release é a 2.0.0; os testes abaixo validam o código 3.0 em desenvolvimento.

| Verificação | Resultado |
| --- | --- |
| TypeScript estrito | Passou |
| ESLint | Passou |
| Vitest | 180 testes, 13 arquivos, todos passaram |
| Chromium / Playwright | 23 fluxos, todos passaram (1,4 minuto) |
| Expo Doctor SDK 55 | 20/20 verificações passaram |
| Exportação web | Bundle gerado |
| Exportação Android | Bundle Hermes gerado; não equivale a instalar um APK |
| Workflow de qualidade | Validado com actionlint; resultado remoto acompanha a PR |

## Cobertura

Os 15 fluxos anteriores continuam passando: cinco modalidades, fichas com elenco sintético de 400 nomes, categorias, importação/exportação JSON, intervalos, bloqueio de giros simultâneos, predefinições, resultado, não repetir, chances 90/30 normalizadas para 75/25, cores, lotes, equipes, modelos e modo foco.

Oito fluxos novos verificam catálogo/busca e largura de 320 px; dados com validação, vantagem, modificador e persistência; compras de cartas sucessivas sem repetição e recarga; ordem com duplicatas e amigo secreto; torneio com folga, campeão e desfazer; data bissexta, filtros e temporizador após reabrir; editor de listas com cancelamento sem perda do rascunho e backup; estatísticas com histórico real de giros/lotes e CSV filtrado.

Testes de motor cobrem migração da 2.0 sem modificar listas, fichas ou pesos; cartas/pares inválidos; coerência entre configuração e resultados dos dados; validação por replay de torneios; calendário UTC e anos bissextos; timer por prazo; conservação de identidades em 1.000 sequências determinísticas. O teste por sementes verifica invariantes, não substitui demonstração matemática de uniformidade nem uma auditoria estatística.

## Evidências visuais

As capturas `v3-laboratory.png`, `v3-laboratory-small.png`, `v3-dice.png`, `v3-cards.png`, `v3-secret.png`, `v3-tournament.png`, `v3-timer.png`, `v3-list-studio.png` e `v3-statistics.png` foram produzidas pelos testes. O relatório é `e2e-results.json`.

## Limites

Não houve execução desta 3.0 em aparelho Android/iOS, nem medição de FPS ou teste físico de vibração, teclado e compartilhamento. O teste web intercepta apenas o compartilhamento para conferir o conteúdo entregue à API. O temporizador é visual, sem alarme em segundo plano. Não foi compilado ou publicado APK 3.0 nesta etapa.

A validação e a assinatura do APK 2.0 já publicado permanecem registradas em `APK-BUILD.json`, `APK-SIGNATURE.txt`, `GITHUB-RELEASE.json` e `GITHUB-DOWNLOAD.md`. O download pelo GitHub foi conferido por tamanho, SHA-256 e CRC ZIP. Nenhum binário da 2.0 foi recompilado para essa publicação.
