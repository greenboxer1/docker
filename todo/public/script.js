document.addEventListener('DOMContentLoaded', () => {
  fetchTasks();

  const form = document.getElementById('task-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const description = document.getElementById('task-input').value;
    const deadline = document.getElementById('deadline-input').value;
    const response = await fetch('/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description, deadline }),
    });
    if (response.ok) {
      document.getElementById('task-input').value = '';
      document.getElementById('deadline-input').value = '';
      fetchTasks(); // Обновление списка задач после добавления новой
    }
  };
});

async function fetchTasks() {
  const response = await fetch('/tasks');
  const tasks = await response.json();
  const list = document.getElementById('task-list');
  list.innerHTML = ''; // Очистка списка перед добавлением элементов

  tasks.forEach((task) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    const formattedDeadline = new Date(task.deadline).toLocaleDateString();
    listItem.innerHTML = `
      ${task.description} <span class="text-muted">(Дедлайн: ${formattedDeadline})</span>
      <div>
        <input type="checkbox" class="form-check-input me-1" ${task.done ? 'checked' : ''} onchange="toggleTaskDone(${task.id}, this)">
        <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
      </div>
    `;
    list.appendChild(listItem);
  });
}

async function toggleTaskDone(id, checkbox) {
  const done = checkbox.checked;
  await fetch(`/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ done }),
  });
  fetchTasks(); // Обновление списка задач после изменения
}

async function deleteTask(id) {
  await fetch(`/tasks/${id}`, {
    method: 'DELETE',
  });
  fetchTasks(); // Обновление списка задач после удаления
}