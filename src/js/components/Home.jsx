import React, { useState, useEffect, useRef } from 'react';
import * as ics from 'ics';
import Confetti from 'react-confetti'; 

const Home = () => {
    // --- ESTADOS ---
    const [tareas, setTareas] = useState(null);
    const [valorInput, setValorInput] = useState("");
    const [idTareaEditando, setIdTareaEditando] = useState(null);
    const [textoEditado, setTextoEditado] = useState("");
    const [lanzarConfeti, setLanzarConfeti] = useState(false); 

    // api
    const username = "josemartinez"; 
    const apiUrl = `https://playground.4geeks.com/todo`;
    const effectRan = useRef(false); //lo he tenido que usar para el modo estricto me daba problemas con la api hacía un doble efecto.

    //efectos usados
    useEffect(() => {
        if (effectRan.current === false) {
            const inicializar = async () => {
                try {
                    const response = await fetch(`${apiUrl}/users/${username}`);
                    if (response.status === 404) {
                        console.log("Usuario no existe. Creando...");
                        await fetch(`${apiUrl}/users/${username}`, { method: "POST" });
                        setTareas([]);
                    } else if (response.ok) {
                        const data = await response.json();
                        setTareas(data.todos || []); 
                        console.log("Tareas cargadas exitosamente.");
                    } else {
                        throw new Error(`Error al cargar datos: ${response.status}`);
                    }
                } catch (error) {
                    console.error("Error en inicialización:", error);
                    setTareas([]);
                }
            };
            inicializar();
        }
        return () => { effectRan.current = true; };
    }, []);

    // para detener el confeti
    useEffect(() => {
        if (lanzarConfeti) {
            const timer = setTimeout(() => setLanzarConfeti(false), 5000); // dura 5 segundos
            return () => clearTimeout(timer);
        }
    }, [lanzarConfeti]);

    // crud

    const agregarTarea = async (e) => {
        if (e.key !== "Enter" || valorInput.trim() === "") return;
        const nuevaTareaPayload = { label: valorInput.trim(), is_done: false };
        try {
            const response = await fetch(`${apiUrl}/todos/${username}`, {
                method: "POST",
                body: JSON.stringify(nuevaTareaPayload),
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) throw new Error("No se pudo añadir la tarea");
            const tareaCreada = await response.json();
            setTareas([...tareas, tareaCreada]);
            setValorInput("");
        } catch (error) {
            console.error("Error añadiendo tarea:", error);
        }
    };

    const marcarComoCompletada = async (tareaAActualizar) => {
        if (idTareaEditando === tareaAActualizar.id) return;
        
        if (!tareaAActualizar.is_done) {
            setLanzarConfeti(true);
        }

        const tareaActualizada = { ...tareaAActualizar, is_done: !tareaAActualizar.is_done };
        try {
            const response = await fetch(`${apiUrl}/todos/${tareaAActualizar.id}`, {
                method: "PUT",
                body: JSON.stringify(tareaActualizada),
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) throw new Error("No se pudo actualizar la tarea");
            setTareas(tareas.map(t => t.id === tareaAActualizar.id ? tareaActualizada : t));
        } catch (error) {
            console.error("Error actualizando la tarea:", error);
        }
    };

    const borrarTarea = async (e, id_tarea) => {
        e.stopPropagation();
        try {
            const response = await fetch(`${apiUrl}/todos/${id_tarea}`, { method: "DELETE" });
            if (response.status !== 204) throw new Error("No se pudo eliminar la tarea");
            setTareas(tareas.filter(t => t.id !== id_tarea));
        } catch (error) {
            console.error("Error eliminando tarea:", error);
        }
    };

    const limpiarTodasLasTareas = async () => {
        try {
            const promesasDeBorrado = tareas.map(tarea =>
                fetch(`${apiUrl}/todos/${tarea.id}`, { method: "DELETE" })
            );
            await Promise.all(promesasDeBorrado);
            setTareas([]);
        } catch(error) {
            console.error("Error limpiando todo:", error);
        }
    };


    const iniciarEdicion = (e, tarea) => {
        e.stopPropagation();
        setIdTareaEditando(tarea.id);
        setTextoEditado(tarea.label);
    };

    const guardarEdicion = async (e, tareaAActualizar) => {
        if (e.key === 'Enter' && textoEditado.trim() !== "") {
            const tareaActualizada = { ...tareaAActualizar, label: textoEditado.trim() };
            try {
                const response = await fetch(`${apiUrl}/todos/${tareaAActualizar.id}`, {
                    method: "PUT",
                    body: JSON.stringify(tareaActualizada),
                    headers: { "Content-Type": "application/json" }
                });
                if (!response.ok) throw new Error("No se pudo guardar la edición");
                setTareas(tareas.map(t => t.id === tareaAActualizar.id ? tareaActualizada : t));
                setIdTareaEditando(null);
                setTextoEditado("");
            } catch (error) {
                console.error("Error guardando edición:", error);
            }
        }
    };

    const exportarICal = () => {
        const eventos = tareas.filter(t => !t.is_done).map(t => {
            const now = new Date();
            return {
                title: t.label,
                start: [now.getFullYear(), now.getMonth() + 1, now.getDate(), 9, 0],
                duration: { hours: 1 }
            };
        });

        if (eventos.length === 0) {
            console.log("No hay tareas pendientes para exportar.");
            return;
        }

        const { error, value } = ics.createEvents(eventos);
        if (error) { console.error(error); return; }

        const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'tareas.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // renderizado
    if (tareas === null) {
        return <h1 style={{textAlign: "center", marginTop: "100px", fontFamily: "sans-serif", color: "white"}}>Cargando...</h1>
    }
    
    return (
        <div className="app-container">
            {lanzarConfeti && <Confetti recycle={false} numberOfPieces={300} />}
            
            <div className="todo-wrapper">
                <header className="todo-header">
                    <h1>To-Do List 📝</h1>
                </header>
                <div className="input-area">
                    <input
                        type="text"
                        className="todo-input"
                        placeholder="¿Qué necesitas hacer?"
                        value={valorInput}
                        onChange={(e) => setValorInput(e.target.value)}
                        onKeyUp={agregarTarea}
                    />
                </div>
                <div className="task-list">
                    {tareas.length === 0 ? (
                        <p className="empty-message">No hay tareas, ¡añade una!</p>
                    ) : (
                        tareas.map((tarea) => (
                            <div key={tarea.id} className={`task-block ${tarea.is_done ? 'completada' : ''}`}>
                                {idTareaEditando === tarea.id ? (
                                    <input 
                                        type="text" 
                                        value={textoEditado} 
                                        onChange={(e) => setTextoEditado(e.target.value)} 
                                        onKeyUp={(e) => guardarEdicion(e, tarea)} 
                                        onBlur={() => setIdTareaEditando(null)}
                                        autoFocus
                                        className="edit-input"
                                    />
                                ) : (
                                    <>
                                        <span className="task-text" onClick={() => marcarComoCompletada(tarea)}>
                                            {tarea.label}
                                        </span>
                                        <div className="task-actions">
                                            <button onClick={(e) => iniciarEdicion(e, tarea)} className="action-btn edit-btn" aria-label="Editar tarea"></button>
                                            <button onClick={(e) => borrarTarea(e, tarea.id)} className="action-btn delete-btn" aria-label="Eliminar tarea"></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
                {tareas.length > 0 && (
                    <div className="footer-section">
                        <span>{tareas.filter(t => !t.is_done).length} tareas restantes</span>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button onClick={exportarICal} className="btn-footer">Exportar .ics</button>
                            <button onClick={limpiarTodasLasTareas} className="btn-footer clear">Limpiar Todas</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;