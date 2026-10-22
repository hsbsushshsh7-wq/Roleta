# Roleta Remake 3.0 — em desenvolvimento

Aplicativo nativo para Android e iOS, em TypeScript, com cinco modalidades, chances por pesos independentes, cores personalizadas, sorteio em lote, equipes equilibradas, roleta SVG animada com Reanimated, fichas independentes, persistência local e backups JSON. A aplicação instalada pelo perfil `preview` ou `production` funciona sem internet e sem servidor Metro. Não utiliza WebView.

**A migração fiel do original ainda depende de acesso à fonte.** O diretório inicial estava vazio. O endereço fornecido, `https://roleta-numerica.kitagawazin.chatgpt.site/wheel`, retornou “Sign in required”; o conector Sites não retornou projetos acessíveis como proprietário ou editor. Não foi possível recuperar a lista de 400 personagens, os poderes, a nona categoria, nem a precisão percentual. Veja [análise e pendências](docs/MIGRATION.md).

O elenco instalado contém somente nove nomes legíveis na imagem; a lista de poderes começa vazia; existem oito categorias confirmadas. Esses limites aparecem no aplicativo. Não foram criadas listas fictícias para substituir as originais. É possível colar listas completas e adicionar categorias pelo próprio aplicativo. A arquitetura suporta 400 personagens e muito mais; os testes usam dados sintéticos identificados como fixtures.

Veja a pesquisa e decisões do remake em [REMAKE-RESEARCH.md](docs/REMAKE-RESEARCH.md), com links às fontes consultadas.

## Versões

A **2.0.0 está publicada**: [baixar APK verificado](https://github.com/hsbsushshsh7-wq/Roleta/releases/download/v2.0.0/roleta-2.0.0.apk). A integridade do download foi conferida contra o binário original. A visibilidade pública preexistente do repositório foi mantida.

Este código inicia a **3.0.0**, com nove novas ferramentas funcionais: dados RPG, baralho, torneio, amigo secreto, ordem aleatória, datas, temporizador, estúdio de listas e estatísticas. O catálogo reúne 12 ferramentas com busca e categorias, contando as três da 2.0. A 3.0 ainda não foi publicada como APK; o link acima entrega a 2.0. Os detalhes estão em [DEVELOPMENT-3.0.0.md](docs/DEVELOPMENT-3.0.0.md).

## Executar

Requisitos: Node.js 22.13+ (validado com 24.19), npm e Expo SDK 55. Para desenvolvimento nativo, emulador/dispositivo Android ou macOS/Xcode para iOS.

```bash
npm ci
npm start
```

Abra no Expo Go compatível com SDK 55 ou gere um development client. Para compilar e executar localmente com Android Studio/SDK configurados:

```bash
npm run android
```

A versão web é uma ferramenta adicional de QA dos mesmos componentes React Native. Não é embutida no aplicativo:

```bash
npm run export:web
npm run preview:web
```

## Gerar APK instalável

O APK de testes 2.0.0 (código 3) foi gerado localmente e validado: `artifacts/roleta.apk` (aproximadamente 45 MB), Android 7.0 ou posterior, ARM64 e ARM de 32 bits. O arquivo foi entregue separadamente do ZIP de código-fonte. A assinatura usa o certificado de testes; o bundle está embutido e dispensa Metro. Não houve execução em aparelho físico. Detalhes em `docs/APK-BUILD.json`.

O EAS continua sem autenticação nesta sessão. Para gerar builds na sua conta, use os comandos abaixo.

Em sua máquina, na pasta do projeto:

```bash
npm ci
npx eas-cli@25.2.0 login
npx eas-cli@25.2.0 init
npm run build:apk
```

O `init` associa o projeto à sua conta Expo e grava o `extra.eas.projectId` real em `app.json`. Não há ID de projeto inventado. O EAS poderá gerar a chave Android na primeira execução. O perfil `preview` entrega um **APK standalone**, com JS e áudio embutidos e sem servidor de desenvolvimento. Baixe e instale pelo link retornado pelo EAS.

Perfis em [eas.json](eas.json):

| Perfil | Finalidade |
| --- | --- |
| `development` | APK com development client; requer Metro durante desenvolvimento |
| `preview` | APK instalável independente, para testes offline |
| `production` | Android App Bundle (AAB) para distribuição em loja |

```bash
npm run build:production
# Simulador iOS (build na nuvem):
npx eas-cli@25.2.0 build --platform ios --profile preview
# Dispositivo/loja iOS, com credenciais Apple:
npx eas-cli@25.2.0 build --platform ios --profile production
```

Identificador: `com.kitagawazin.roleta`. Nome: `Roleta`. Ícones e splash próprios em `assets/`. Atualizações remotas desativadas. Nenhuma permissão de microfone ou armazenamento amplo é necessária. EAS usa geração nativa contínua; `android/` e `ios/` são gerados pelo Expo, não incluídos no arquivo ZIP.

## Gerar APK local sem conta Expo

O projeto também oferece `npm run build:apk:local`. Requer Node.js, **JDK 17**, Android SDK com plataforma 36, Build Tools 36.0.0, NDK 27.1.12297006 e CMake 3.22.1. Configure `ANDROID_HOME` e `JAVA_HOME` para suas instalações.

```bash
npm ci
npm run build:apk:local
```

O script executa o prebuild e `assembleRelease`, inclui os bundles no APK e copia o resultado para `artifacts/roleta.apk`. Por padrão, inclui `arm64-v8a` e `armeabi-v7a`, para Android 7.0 ou posterior. Não requer Metro após a instalação. A assinatura local usa o certificado de testes do projeto; para distribuição em loja, use seu certificado de produção pelo EAS. O SDK e o JDK ficam fora do código-fonte.

## Uso

- Abra o seletor sob o cabeçalho para alternar modalidades. Cada uma conserva suas próprias listas e intervalos.
- Edite o intervalo ou a lista e toque em **Atualizar**. O botão central e **Girar agora** executam o mesmo comando.
- Percentuais usam por padrão passo 1%; pode ser alterado até 0,01%. O passo deve alcançar o limite final exatamente. Essa é uma regra desta implementação, não uma regra confirmada do site.
- Listas aceitam vírgula, ponto e vírgula e quebras de linha. Espaços externos e entradas vazias são removidos. Duplicatas são preservadas como opções distintas.
- No criador, cada giro preenche a categoria destacada e avança para a primeira pendente. Toque em uma categoria pendente para escolhê-la. Toque em uma preenchida para preparar um novo giro, com confirmação.
- Configure de 1 a 30 fichas. A quantidade de categorias abre o editor: adicione, renomeie, remova e reordene até 50 categorias. Alterações atingem a ficha atual e o modelo das novas fichas; as demais continuam independentes.
- O disquete abre **Predefinições**: dê um nome à roleta, salve, carregue ou exclua configurações. São guardados o modo, suas opções, chances e bloqueios; no criador, também as fichas. Nomes repetidos exigem confirmação para substituir. A lista começa vazia. Alterações e resultados continuam sendo salvos automaticamente.
- **Personalizar → Sorteio**: ative **Chances independentes** e informe pesos. Alterar uma opção preserva os valores das demais. A = 90 e B = 30 resultam em 75% e 25% reais. **Igualar** define peso 100 para cada entrada. Peso 0 pausa uma opção. A interface mostra o peso e a probabilidade calculada; há busca e paginação.
- **Personalizar → Visual**: escolha entre cinco paletas, defina cores HEX por opção, dê um título à roleta e mostre/oculte os nomes. **Usar paleta** remove as cores manuais. Tudo é incluído nas predefinições.
- **Experiência**: controle o pop-up, áudio, vibração e duração. **Modo foco** oculta o editor da tela principal e é persistido.
- **Ferramentas → Modelos**: sim/não, cara ou coroa, D6, D20, letras e dias da semana. A configuração deslocada é preservada automaticamente em uma predefinição.
- **Ferramentas → Em lote**: gere de 1 a 100 resultados com os mesmos pesos e bloqueios, sem animação individual. O histórico identifica esses resultados como lote. O criador usa somente giros individuais.
- **Ferramentas → Equipes**: divida uma lista de 2 a 5.000 entradas em 2 a 20 grupos de tamanhos equilibrados. Resultados, lotes e equipes podem ser compartilhados pelo sistema do aparelho.
- **Não repetir** bloqueia todas as entradas já sorteadas nessa modalidade. O botão **RESET** libera o conjunto, preservando listas, chances e fichas. Ao esgotar opções elegíveis, o app informa o motivo. Entradas duplicadas são opções independentes.
- Ao terminar o giro, um pop-up mostra o resultado real, permite fechar ou **Girar novamente**. No criador, mostra a categoria preenchida.
- **Preferências e backups** reúne som, vibração, duração, aparência e transferência JSON.
- O menu dá acesso ao histórico de até 200 giros. Limpá-lo preserva as fichas, mas limpa o “Último resultado”.
- Preferências permitem exportar/importar backups JSON completos. A importação valida todos os dados e pede confirmação antes de substituir o estado. A restauração de listas usa o padrão salvo pelo usuário; os padrões originais indisponíveis não são simulados.

## Verificações

```bash
npm run check
NODE_USE_ENV_PROXY=1 npx expo-doctor
npm run export:android
npm run export:web
```

Testes dos fluxos no Chromium, após exportar para web:

```bash
npx playwright install chromium
npm run test:e2e
# No ambiente desta entrega, que já possui Chromium:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

A validação da 2.0 incluiu 99 testes de lógica/integração e 15 fluxos no Chromium. A validação da 3.0 está registrada separadamente em [VALIDATION.md](docs/VALIDATION.md), para não confundir o código em desenvolvimento com o APK publicado. Testes web não comprovam FPS, haptics, seletor de arquivos nativo ou execução Android/iOS real.

## Organização

```text
src/
  models/       contratos TypeScript
  data/         dados comprovados nas imagens e metadados das modalidades
  engine/       probabilidade, ângulos, opções, geometria e fichas (sem UI)
  hooks/        controle do giro e integração com Reanimated/haptics/áudio
  components/   roleta, cartões, editores, modais e fichas
  screens/      composição da tela principal
  state/        estado da aplicação e hidratação
  storage/      schema JSON, fila de gravações e recuperação por backup
  services/     importação e exportação de arquivos
  theme/        cores, tipografia, espaçamentos e paleta radial
```

Detalhes técnicos e decisões matemáticas em [ARCHITECTURE.md](docs/ARCHITECTURE.md).
