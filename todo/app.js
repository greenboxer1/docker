const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const sequelize = new Sequelize('sqlite:./database/todo.db');

app.use(bodyParser.json());
app.use(express.static('public'));

const Task = sequelize.define('Task', {
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  done: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

app.get('/tasks', async (req, res) => {
  const tasks = await Task.findAll();
  res.json(tasks);
});

app.post('/tasks', async (req, res) => {
  const { description, deadline } = req.body;
  const task = await Task.create({ description, deadline });
  res.json(task);
});

app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const task = await Task.findByPk(id);
  task.done = req.body.done;
  await task.save();
  res.json(task);
});

app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  await Task.destroy({ where: { id } });
  res.status(204).send();
});

const PORT = 3000;
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});