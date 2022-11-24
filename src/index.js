const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middleware, usado para exibir dados JSON na aplicação
app.use(express.json());

// Dados ficticios
const customers = [];

// Middleware
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  // Faz uma busca no array Customers, para saber se o cpf já existe, e retorna o objeto encontrado;
  const customer = customers.find(customer => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ message: "Customer not found!" })
  }

  // Repassando o custumer para as demais rotas que estão usando o middleware
  request.customer = customer;

  return next(); // Caso esteja tudo correto no Middleware, o next prosegue;
}

// Functions para calcular o saldo do cliente
function getBalance(statement) {
  const balance = statement.reduce((accumulation, operation) => {
    if (operation.type === 'credit') {
      return accumulation + operation.amount;
    } else {
      return accumulation - operation.amount;
    }
  }, 0);

  return balance;
}

// Create account
app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  // Faz uma busca com (SOME) no array Customers, para saber se o cpf já existe, e retorna (TRUE ou FALSE);
  const customersAlreadyExist = customers.some((customer) => customer.cpf === cpf);

  if (customersAlreadyExist) {
    return response.status(400).json({ error: 'Customer already exists!' });
  }

  customers.push({
    id: uuidv4(),
    name,
    cpf,
    statement: [],
  });

  return response.status(201).send();
});

// Dessa forma todas as rotas abaixo vão passar pelo Middleware;
//app.use(verifyIfExistsAccountCPF);

// Search for statement of Client, com verificação de middleware, sempre entre a rota e o (request, response);
app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});

// Deposit in account
app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

// Saque in account
app.post('/withdrawn', verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: 'Insufficient funds!' });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit'
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

// Search for statement of Client, com verificação de middleware, sempre entre a rota e o (request, response);
app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormatted = new Date(date + " 00:00"); // adicione um espaço antes da hora

  const statement = customer.statement.filter(
    (statement) => statement.created_at.toDateString() === new Date(dateFormatted).toDateString()
  );

  return response.json(statement);
});

// Update account information
app.put('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

// Get all data of account
app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json({ customer });
});

// Delete account
app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  // Splice the account
  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

// Balance the account
app.get('/balance', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
});

// Ouvindo uma porta no localhost:3333
app.listen(3333)