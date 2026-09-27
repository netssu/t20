# Tormenta20 — ficha digital

Ficha web estática para Tormenta20, feita para funcionar no navegador e ser publicada no GitHub Pages. Não precisa de servidor, instalação ou serviços externos. Os dados da ficha ficam no armazenamento local do navegador; use Exportar JSON para guardar um backup ou Importar JSON para recuperar uma ficha.

## Publicar no GitHub Pages

1. Copie estes arquivos para a raiz do repositório GitHub que receberá o site.
2. Abra Settings → Pages.
3. Em Build and deployment, escolha Deploy from a branch, selecione a branch desejada e a pasta raiz (/).
4. Salve. O arquivo index.html é a página inicial e .nojekyll evita que o GitHub Pages filtre arquivos do site.

O site usa caminhos relativos e não precisa de etapa de build, então também pode ser aberto localmente.

## O que a ficha calcula

- Valores de atributos, bônus de raça e compra por pontos.
- Perícias, treinamento, bônus por nível e penalidade de armadura.
- PV, PM, Defesa, iniciativa, resistências, ataques e capacidade de carga.
- CD e métricas de magia de acordo com classe, nível e atributo-chave.
- Catálogos locais de armas, armaduras, escudos, itens, raças, classes e perícias.
- Progressão básica de classe até o nível 20, com espaço para registrar poderes e habilidades adicionais.

Os dados de magias incluem nome, círculo, escola e tipo Arcano/Divino. Descrições, exceções de regras e habilidades situacionais devem ser consultadas no livro e podem ser anotadas na ficha. As opções de raça e classe registram seus modificadores e características principais; nem todo texto de regra do livro foi transcrito para automação.

## Arquivos principais

- index.html: estrutura e abas da ficha.
- styles.css: tema visual responsivo.
- app.js: interações, cálculos, gravação local e importação/exportação.
- data.js: dados locais de regras e equipamentos.
- spell-catalog.js: índice local de 227 magias.

Os PDFs de referência não são necessários para executar o site e não estão incluídos no repositório.
