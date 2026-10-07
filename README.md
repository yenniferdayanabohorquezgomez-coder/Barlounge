# BARLOUNGE

Proyecto funcional de referencia construido con la arquitectura definida para BARLOUNGE: React + Node.js/Express + MySQL + API REST.

## Sprint 2
- HU01 Login
- HU02 Recuperación de contraseña
- HU03 Dashboard
- HU04-HU06 Usuarios
- HU07-HU09 Sedes
- Roles y permisos reales en backend
- Cierre de sesión por 3 minutos de inactividad

## Sprint 3
- HU10-HU12 Productos
- HU13-HU14 Proveedores
- HU15 Tipos de producto
- HU17 Inventario por sede
- HU28-HU29 Consulta e incremento de inventario
- Selección como algoritmo de ordenamiento del catálogo

## Requisitos
- Node.js 18+
- MySQL 8+

## 1. Base de datos
1. Abrir `database` en MySQL Workbench y ejecutarlo.
2. Entrar a `backend` y copiar `.env.example` a `.env`.
3. Configurar las credenciales de MySQL.
4. Ejecutar `npm install` y luego `npm run seed`.

## 2. Backend
```bash
cd backend
npm install
npm run seed
npm run dev
```
API: http://localhost:8080
Health: http://localhost:8080/api/health

## 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## Credenciales de prueba
- Administrador: `ADMIN001 / Admin123*`
- Mesero: `WAITER0011 / Main1234*`
- Cajero: `CASHIER001 / Cashier123*`
- Cajero: `CAJERO001 / Juan123* / juan@gmail.com`
- Administrador: `ADMIN002 / Dayana123* / yenniferdayanabohorquezgomez@gmail.com`

## Algoritmo
El algoritmo de selección está en `frontend/src/utils/selectionSort.js` y se utiliza en `Products.jsx` para ordenar el catálogo antes de mostrarlo.

## Nota de integración
Este paquete contiene una implementación completa y ejecutable alineada con los documentos entregados para los Sprints 2 y 3. No sobrescribe automáticamente tu carpeta anterior ni pretende preservar archivos que no fueron adjuntados en la conversación.