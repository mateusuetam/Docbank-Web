# Docbank Web

O Docbank-Web foi desenvolvido com Java 21, Spring Boot, Spring Security, Spring JDBC e MySQL. Originalmente o projeto foi desenvolvido com persistência no `localStorage` e posteriormente foi migrado para uma arquitetura web com backend REST e persistência em banco de dados.

## Funcionalidades

- Cadastro e login de usuários.
- Controle de sessão com Spring Security.
- Níveis de acesso: usuário, moderador e administrador.
- Suspensão e reativação de contas.
- Alteração de cargos por administradores.
- Submissão, edição, aprovação e rejeição de documentos.
- Suporte a documentos por link (`http`/`https`) e arquivos PDF.
- Armazenamento dos arquivos PDF no MySQL (BLOB).
- Biblioteca pessoal de documentos favoritos.
- Persistência dos dados no MySQL.
- Proteção CSRF nas operações que alteram dados.

## Banco de dados

Antes de executar a aplicação, é necessário criar o banco de dados MySQL utilizado pelo projeto.

O repositório disponibiliza o script:

```text
sql/DBCreatorMYSQL.sql
```

Esse script deve ser executado antes da primeira inicialização da aplicação e cria o banco com o nome esperado pelo projeto: **`docbank`**.

## Configuração de credenciais

As credenciais do MySQL e a senha utilizada para autorizar a criação de contas de moderador e administrador **não ficam armazenadas diretamente no projeto**.

O arquivo `application.properties` utiliza as seguintes variáveis:

```properties
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
docbank.cadastro.senha-autorizacao=${DOCBANK_CADASTRO_SENHA:}
```

Portanto, antes de iniciar a aplicação, é necessário informar:

- `DB_USERNAME`: usuário do MySQL.
- `DB_PASSWORD`: senha do MySQL.
- `DOCBANK_CADASTRO_SENHA`: senha de autorização usada para criar contas de moderador e administrador.

Não é necessário gravar esses valores em `application.properties`.

## Executando no Linux

Entre no diretório da aplicação:

```bash
cd docbank
```

Execute o Spring Boot informando as variáveis de ambiente na própria linha de comando:

```bash
DB_USERNAME=root DB_PASSWORD='minha_senha_do_mysql' DOCBANK_CADASTRO_SENHA='senha_de_criacao_de_contas_admin_e_mod' ./mvnw spring-boot:run
```

A aplicação será iniciada em:

```text
http://localhost:8080/
```

A página inicial é servida pelo projeto em:

```text
http://localhost:8080/HTML/index.html
```

## Build

Para compilar, executar os testes e gerar os artefatos Maven:

```bash
DB_USERNAME=root DB_PASSWORD='minha_senha_do_mysql' DOCBANK_CADASTRO_SENHA='senha_de_criacao_de_contas_admin_e_mod' ./mvnw clean package
```

## Observações

- O MySQL deve estar em execução antes de iniciar o Spring Boot.
- O banco `docbank` precisa existir antes da primeira execução.
- Os dados de usuários, documentos e favoritos são persistidos no MySQL.
- Arquivos PDF enviados pela aplicação são armazenados no banco de dados.
- As credenciais e a senha de autorização devem ser fornecidas pelo ambiente de execução e não devem ser adicionadas ao repositório.
