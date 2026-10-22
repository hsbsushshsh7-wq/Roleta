# Roleta Remake — Android

Distribuição do aplicativo Android Roleta.

## Versão 2.0.0

Baixe o APK em [Releases](https://github.com/hsbsushshsh7-wq/Roleta/releases/tag/v2.0.0).

O arquivo publicado é o APK original previamente compilado, sem recompilação para esta publicação. O commit da tag v2.0.0 documenta a distribuição do binário original.

- Pacote: `com.kitagawazin.roleta`
- Versão: `2.0.0` (código 3)
- Android 7.0 ou posterior; ARM64 e ARM de 32 bits
- APK standalone: funciona sem servidor de desenvolvimento
- Assinatura: certificado de testes do aplicativo
- SHA-256: `cb980eb14c4ec9dc5714bbbc4dcee0cc902d773966202ae682f99c556a10d750`

A integridade e a assinatura do arquivo foram verificadas antes da publicação. Não houve teste de execução em aparelho físico neste ambiente.

Novidades: pesos independentes (90 + 30 = 75% + 25%), cinco paletas, cores HEX por fatia, título e nomes opcionais, modo foco, controle do pop-up, seis modelos rápidos, sorteio em lote e equipes equilibradas.

Validação: 99 testes de lógica, 15 fluxos de interface no Chromium, TypeScript, lint e Expo Doctor passaram. A versão 1.1.0 permanece disponível nas Releases.


## Desenvolvimento 3.0.0

O projeto Expo/React Native está em [`mobile/`](mobile/README.md). Esta proposta inicia a 3.0.0 com laboratório de jogos e ferramentas: dados RPG, baralho, torneio, amigo secreto, ordem aleatória, datas, temporizador, estúdio de listas e estatísticas. O catálogo reúne 12 ferramentas offline.

Validação local da 3.0: 180 testes de lógica, 23 fluxos de interface, TypeScript, lint, Expo Doctor 20/20 e exportações web/Android. O workflow da proposta repete a validação no GitHub. [Escopo e limites](mobile/docs/DEVELOPMENT-3.0.0.md).

A 3.0 está em desenvolvimento e não tem APK publicado nesta etapa. O link da Release acima continua entregando a 2.0.0.
