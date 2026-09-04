import React, { useState } from "react";
import api from "../api";

/**
 * Formulaire d'ajout d'une tâche.
 *
 * @component
 * @param {Object} props
 * @param {(task: Object) => void} props.addTask - Fonction appelée avec la tâche créée, pour l'ajouter à la liste du parent.
 * @returns {JSX.Element}
 */
const TaskForm = ({ addTask }) => {
  const [title, setTitle] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await api.post(
        "/tasks",
        { title },
        {
          headers: { "x-auth-token": token },
        }
      );
      addTask(res.data);
      setTitle("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-group">
      <input
        type="text"
        placeholder="Ajouter une tâche ..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="submit" className="btn" style={{ marginTop: "10px" }}>
        Ajouter Tâche
      </button>
    </form>
  );
};

export default TaskForm;
