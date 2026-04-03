/**
 * EJEMPLOS - Cómo usar el Cliente API Cifrado
 * 
 * Ejemplos reales con Usuarios y Roles
 */

import apiClient from './api-client';

// ============================================================================
// EJEMPLO 1: Obtener Lista de Usuarios
// ============================================================================

export async function fetchUsers() {
  try {
    console.log('📥 Obteniendo usuarios...');
    
    // La respuesta se descifra automáticamente
    const users = await apiClient.get('/usuarios/');
    
    console.log('Usuarios obtenidos:', users);
    return users;
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    throw error;
  }
}

// ============================================================================
// EJEMPLO 2: Crear Nuevo Usuario
// ============================================================================

export async function createUser(userData) {
  try {
    console.log('📤 Creando usuario...', userData);
    
    // El payload se cifra automáticamente antes de enviar
    const newUser = await apiClient.post('/usuarios/', {
      nombre: userData.nombre,
      email: userData.email,
      password: userData.password,
      role_id: userData.roleId,
    });
    
    console.log('Usuario creado:', newUser);
    return newUser;
  } catch (error) {
    console.error('Error creando usuario:', error);
    throw error;
  }
}

// Uso:
// await createUser({
//   nombre: 'Juan García',
//   email: 'juan@example.com',
//   password: 'MyCoolPassword123!',
//   roleId: 2
// });

// ============================================================================
// EJEMPLO 3: Actualizar Usuario
// ============================================================================

export async function updateUser(userId, userData) {
  try {
    console.log(`📝 Actualizando usuario ${userId}...`);
    
    const updatedUser = await apiClient.put(`/usuarios/${userId}/`, {
      nombre: userData.nombre,
      email: userData.email,
      is_active: userData.isActive,
    });
    
    console.log('✅ Usuario actualizado:', updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    throw error;
  }
}

// Uso:
// await updateUser(5, {
//   nombre: 'Juan García López',
//   email: 'juan.garcia@example.com',
//   isActive: true
// });

// ============================================================================
// EJEMPLO 4: Eliminar Usuario
// ============================================================================

export async function deleteUser(userId) {
  try {
    console.log(`🗑️  Eliminando usuario ${userId}...`);
    
    const result = await apiClient.delete(`/usuarios/${userId}/`);
    
    console.log('✅ Usuario eliminado:', result);
    return result;
  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    throw error;
  }
}

// ============================================================================
// EJEMPLO 5: Obtener Lista de Roles
// ============================================================================

export async function fetchRoles() {
  try {
    console.log('📥 Obteniendo roles...');
    
    const roles = await apiClient.get('/roles/');
    
    console.log('✅ Roles obtenidos:', roles);
    return roles;
  } catch (error) {
    console.error('❌ Error obteniendo roles:', error);
    throw error;
  }
}

// ============================================================================
// EJEMPLO 6: Crear Nuevo Rol
// ============================================================================

export async function createRole(roleData) {
  try {
    console.log('📤 Creando rol...', roleData);
    
    const newRole = await apiClient.post('/roles/', {
      nombre: roleData.nombre,
      descripcion: roleData.descripcion,
      permisos: roleData.permisos, // Array de IDs de permisos
    });
    
    console.log('✅ Rol creado:', newRole);
    return newRole;
  } catch (error) {
    console.error('❌ Error creando rol:', error);
    throw error;
  }
}

// Uso:
// await createRole({
//   nombre: 'Moderador',
//   descripcion: 'Rol para moderadores del sistema',
//   permisos: [1, 2, 5, 8]
// });

// ============================================================================
// EJEMPLO 7: Actualizar Rol
// ============================================================================

export async function updateRole(roleId, roleData) {
  try {
    console.log(`📝 Actualizando rol ${roleId}...`);
    
    const updatedRole = await apiClient.put(`/roles/${roleId}/`, {
      nombre: roleData.nombre,
      descripcion: roleData.descripcion,
      permisos: roleData.permisos,
    });
    
    console.log('✅ Rol actualizado:', updatedRole);
    return updatedRole;
  } catch (error) {
    console.error('❌ Error actualizando rol:', error);
    throw error;
  }
}

// ============================================================================
// EJEMPLO 8: Asignar Rol a Usuario
// ============================================================================

export async function assignRoleToUser(userId, roleId) {
  try {
    console.log(`🔐 Asignando rol ${roleId} a usuario ${userId}...`);
    
    const result = await apiClient.put(`/usuarios/${userId}/`, {
      role_id: roleId,
    });
    
    console.log('✅ Rol asignado:', result);
    return result;
  } catch (error) {
    console.error('❌ Error asignando rol:', error);
    throw error;
  }
}

// ============================================================================
// EJEMPLO 9: Búsqueda/Filtrado de Usuarios
// ============================================================================

export async function searchUsers(filters) {
  try {
    const query = new URLSearchParams(filters).toString();
    console.log('🔍 Buscando usuarios...', filters);
    
    const users = await apiClient.get(`/usuarios/?${query}`);
    
    console.log('✅ Resultados de búsqueda:', users);
    return users;
  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    throw error;
  }
}

// Uso:
// await searchUsers({
//   nombre: 'Juan',
//   email: 'example.com',
//   role_id: 2,
//   is_active: true
// });

// ============================================================================
// EJEMPLO 10: Obtener Detalles de Usuario
// ============================================================================

export async function getUserDetails(userId) {
  try {
    console.log(`📄 Obteniendo detalles del usuario ${userId}...`);
    
    const user = await apiClient.get(`/usuarios/${userId}/`);
    
    console.log('✅ Detalles del usuario:', user);
    return user;
  } catch (error) {
    console.error('❌ Error obteniendo detalles:', error);
    throw error;
  }
}

// ============================================================================
// EJEMPLO 11: FLUJO COMPLETO - Registrar Nuevo Usuario
// ============================================================================

export async function registerUser(formData) {
  try {
    console.log('🔄 Iniciando registro de usuario...');
    
    // Paso 1: Validar email no exista
    console.log('  → Validando email...');
    const existing = await searchUsers({ email: formData.email });
    if (existing.length > 0) {
      throw new Error('Email ya está registrado');
    }
    
    // Paso 2: Obtener rol "usuario" por defecto
    console.log('  → Obteniendo rol por defecto...');
    const roles = await fetchRoles();
    const userRole = roles.find(r => r.nombre === 'Usuario');
    if (!userRole) {
      throw new Error('Rol "Usuario" no encontrado');
    }
    
    // Paso 3: Crear el usuario
    console.log('  → Creando usuario...');
    const newUser = await createUser({
      nombre: formData.nombre,
      email: formData.email,
      password: formData.password,
      roleId: userRole.id,
    });
    
    console.log('✅ Usuario registrado exitosamente:', newUser);
    return newUser;
  } catch (error) {
    console.error('❌ Error en registro:', error.message);
    throw error;
  }
}

// Uso:
// await registerUser({
//   nombre: 'Pedro Ruiz',
//   email: 'pedro@example.com',
//   password: 'SecurePass123!'
// });

// ============================================================================
// EJEMPLO 12: FLUJO COMPLETO - Admin cambia rol de usuario
// ============================================================================

export async function changeUserRole(userId, newRoleName) {
  try {
    console.log(`🔄 Cambiando rol del usuario ${userId}...`);
    
    // Paso 1: Obtener roles
    console.log('  → Obteniendo roles disponibles...');
    const roles = await fetchRoles();
    
    // Paso 2: Encontrar el rol por nombre
    const newRole = roles.find(r => r.nombre === newRoleName);
    if (!newRole) {
      throw new Error(`Rol "${newRoleName}" no encontrado`);
    }
    
    // Paso 3: Asignar rol
    console.log(`  → Asignando rol ${newRole.nombre}...`);
    const updated = await assignRoleToUser(userId, newRole.id);
    
    console.log('✅ Rol cambiado exitosamente:', updated);
    return updated;
  } catch (error) {
    console.error('❌ Error cambiando rol:', error.message);
    throw error;
  }
}

// Uso:
// await changeUserRole(5, 'Administrador');
