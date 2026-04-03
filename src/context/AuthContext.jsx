import { createContext, useEffect, useMemo, useState } from 'react';
import { login } from '../services/auth.api';

export const AuthContext = createContext();

const STORAGE_KEYS = {
    jwt: 'jwt',
    refresh: 'refresh',
    user: 'user',
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = () => {
        localStorage.removeItem(STORAGE_KEYS.jwt);
        localStorage.removeItem(STORAGE_KEYS.refresh);
        localStorage.removeItem(STORAGE_KEYS.user);
    };

    const handleLogout = () => {
        setUser(null);
        setError(null);
        clearSession();
    };

    const handleLogin = async (correo, password) => {
        try {
            setLoading(true);

            const response = await login({ correo, contrasena: password });

            const token = response?.data?.access;
            const refresh = response?.data?.refresh;
            const usuario = response?.data?.usuario;

            console.log("token: ", token);
            console.log("usuario: ", usuario);  
            

            if (!token || !usuario) {
                throw new Error('Respuesta inválida del servidor');
            }

            // Guardar en localStorage
            localStorage.setItem(STORAGE_KEYS.jwt, token);
            localStorage.setItem(STORAGE_KEYS.refresh, refresh);
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(usuario));

            // Setear usuario
            setUser({
                username: usuario.nombre,
                role: usuario.rol,
                userId: usuario.id_usuario,
            });

            console.log("usuario seteado: ", user);
            

            setError(null);
            return {
                success: true,
                user: {
                    username: usuario.nombre,
                    role: usuario.rol,
                    userId: usuario.id_usuario,
                },
            };

        } catch (err) {
            console.error('Error en login:', err);
            setUser(null);
            setError(err?.response?.data?.message || err.message || 'Error de autenticación');
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Restaurar sesión
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem(STORAGE_KEYS.user);

            if (storedUser) {
                const parsed = JSON.parse(storedUser);

                setUser({
                    username: parsed.nombre,
                    role: parsed.rol,
                    userId: parsed.id_usuario,
                });
            }
        } catch (err) {
            console.error('Error restaurando sesión:', err);
            handleLogout();
        } finally {
            setLoading(false);
        }
    }, []);

    const value = useMemo(
        () => ({
            user,
            error,
            loading,
            isAuthenticated: !!user,
            handleLogin,
            handleLogout,
        }),
        [user, error, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
