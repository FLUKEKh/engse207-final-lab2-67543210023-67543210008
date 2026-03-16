const API = '';
let token = localStorage.getItem('token');

if (token) showBoard();

async function login() {
  const email    = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      document.getElementById('auth-error').textContent = data.error;
      return;
    }

    token = data.token;
    localStorage.setItem('token', token);
    showBoard();
  } catch (err) {
    document.getElementById('auth-error').textContent = 'เชื่อมต่อ Server ไม่ได้';
  }
}

function logout() {
  localStorage.removeItem('token');
  token = null;
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('board-section').style.display = 'none';
  document.getElementById('logout-btn').style.display = 'none';
  document.getElementById('user-info').textContent = '';
}

function showBoard() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('board-section').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'inline-block';
  document.getElementById('logout-btn').onclick = logout;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    document.getElementById('user-info').textContent = `👤 ${payload.email} (${payload.role})`;
  } catch {}

  loadTasks();
}

async function loadTasks() {
  try {
    const res  = await fetch(`${API}/api/tasks/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (res.status === 401) { logout(); return; }

    document.getElementById('col-todo').innerHTML      = '';
    document.getElementById('col-inprogress').innerHTML = '';
    document.getElementById('col-done').innerHTML      = '';

    (data.tasks || []).forEach(task => {
      const col = task.status === 'TODO'        ? 'col-todo'
                : task.status === 'IN_PROGRESS' ? 'col-inprogress'
                : 'col-done';
      document.getElementById(col).appendChild(createTaskCard(task));
    });
  } catch (err) {
    console.error('Load tasks error:', err);
  }
}

function createTaskCard(task) {
  const div = document.createElement('div');
  div.className = 'task-card';
  div.innerHTML = `
    <h4>${task.title}</h4>
    <p>${task.description || ''}</p>
    <span class="badge badge-${task.priority}">${task.priority}</span>
    <div class="task-actions" style="margin-top:8px">
      ${task.status !== 'IN_PROGRESS' ? `<button class="btn btn-sm" onclick="updateStatus(${task.id},'IN_PROGRESS')">▶ In Progress</button>` : ''}
      ${task.status !== 'DONE'        ? `<button class="btn btn-sm" onclick="updateStatus(${task.id},'DONE')">✅ Done</button>` : ''}
      <button class="btn btn-sm btn-danger" onclick="deleteTask(${task.id})">🗑</button>
    </div>`;
  return div;
}

async function addTask() {
  const title    = document.getElementById('task-title').value;
  const desc     = document.getElementById('task-desc').value;
  const priority = document.getElementById('task-priority').value;

  if (!title.trim()) { alert('กรุณากรอกชื่อ Task'); return; }

  await fetch(`${API}/api/tasks/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, description: desc, priority })
  });

  hideAddForm();
  loadTasks();
}

async function updateStatus(id, status) {
  await fetch(`${API}/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
  loadTasks();
}

async function deleteTask(id) {
  if (!confirm('ลบ Task นี้?')) return;
  await fetch(`${API}/api/tasks/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  loadTasks();
}

function showAddForm() { document.getElementById('add-form').style.display = 'block'; }
function hideAddForm() {
  document.getElementById('add-form').style.display = 'none';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value  = '';
}