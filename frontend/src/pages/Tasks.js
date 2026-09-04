import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Ajout
import api from "../api";
import TaskForm from "../components/TaskForm";

/**
 * Page « Mes Tâches ».
 *
 * Affiche la liste des tâches de l'utilisateur connecté (récupérées via l'API),
 * permet d'en ajouter et d'en supprimer. Redirige vers /login si aucun token
 * n'est présent.
 *
 * @component
 * @returns {JSX.Element} La page listant les tâches.
 */
const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const navigate = useNavigate(); // Ajout

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    const fetchTasks = async () => {
      const res = await api.get("/tasks", {
        headers: { "x-auth-token": token },
      });
      setTasks(res.data);
    };
    fetchTasks();
  }, [navigate]);

  const addTask = (task) => {
    // L'utilisateur doit rafraîchir la page pour voir la nouvelle tâche.
    // Pour corriger, il faudrait faire : setTasks([task, ...tasks]);
    setTasks([task, ...tasks]);
  };

  const deleteTask = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/tasks/${id}`, { headers: { "x-auth-token": token } });
      setTasks(tasks.filter((task) => task._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComplete = async (task) => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.put(
        `/tasks/${task._id}`,
        {
          title: task.title,
          description: task.description,
          isCompleted: !task.isCompleted,
        },
        { headers: { "x-auth-token": token } }
      );
      setTasks(tasks.map((t) => (t._id === task._id ? res.data : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (task) => {
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
  };

  const saveEdit = async (task) => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.put(
        `/tasks/${task._id}`,
        {
          title: editTitle,
          description: editDescription,
          isCompleted: task.isCompleted,
        },
        { headers: { "x-auth-token": token } }
      );
      setTasks(tasks.map((t) => (t._id === task._id ? res.data : t)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      <h1>Mes Tâches</h1>
      <TaskForm addTask={addTask} />
      <ul className="task-list">
        {tasks.map((task) => (
          <li
            key={task._id}
            className={`task-item ${task.isCompleted ? "completed" : ""}`}
          >
            {editingId === task._id ? (
              <>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  style={{ flex: 1, marginLeft: "10px" }}
                />
                <button onClick={() => saveEdit(task)}>Enregistrer</button>
                <button onClick={() => setEditingId(null)}>Annuler</button>
              </>
            ) : (
              <>
                <input
                  type="checkbox"
                  checked={task.isCompleted}
                  onChange={() => toggleComplete(task)}
                />
                <span
                  onClick={() =>
                    setExpandedId(expandedId === task._id ? null : task._id)
                  }
                  style={{ cursor: "pointer", flex: 1, marginLeft: "10px" }}
                >
                  {task.title}
                  {expandedId === task._id && (
                    <small style={{ display: "block", color: "#666" }}>
                      {task.description || "(pas de description)"}
                    </small>
                  )}
                </span>
                <button onClick={() => startEdit(task)}>Modifier</button>
                <button onClick={() => deleteTask(task._id)}>Supprimer</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Tasks;
