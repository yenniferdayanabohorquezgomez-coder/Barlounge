## 1. Descripción general

BARLOUNGE permite gestionar la operación de varias sedes: usuarios y roles, catálogo de productos, proveedores, tipos de producto, asignación y consulta de inventario por sede, mesas, pedidos, cobros, comprobantes internos, reportes y auditoría.

La aplicación está compuesta por:

- **Frontend:** React 19, Vite y React Router.
- **Backend:** Node.js, Express 4 y API REST.
- **Base de datos:** MySQL mediante `mysql2/promise`.
- **Autenticación:** JWT, sesiones registradas en MySQL y contraseñas procesadas con `bcryptjs`.
- **Protección de datos del comprador:** cifrado AES-256-GCM en el backend para nombre y documento asociados a facturas.

## 2. Funcionalidades del sistema

### 2.1 Administración

- Inicio de sesión y cierre de sesión.
- Recuperación de contraseña mediante código enviado por correo.
- Panel principal.
- Administración de usuarios, roles y sedes.
- Administración de productos, proveedores y tipos de producto.
- Asignación de productos a sedes.
- Consulta e incremento de inventario.
- Registro de auditoría.
- Reportes de ventas, inventario y productos más vendidos.
- Exportación de reportes a Excel.

### 2.2 Operación

- Consulta de mesas por sede.
- Creación y actualización de pedidos.
- Agregar, modificar y retirar productos de pedidos.
- Guardar o cancelar pedidos según las reglas de la aplicación.
- Procesar pagos y calcular cambio.
- Consultar e imprimir comprobantes internos.

### 2.3 Roles del sistema

El código contempla los siguientes roles:

| Rol | Responsabilidad |
|---|---|
| Administrador | Gestión administrativa y supervisión general del sistema. |
| Mesero | Gestión de mesas y pedidos. |
| Cajero | Gestión de caja, pagos y comprobantes internos. |

La interfaz restringe vistas por rol y el backend aplica middleware de autenticación y permisos en las rutas protegidas. La autorización por sede y por registro debe probarse adicionalmente; ocultar una opción en el frontend no sustituye el control del backend.

---

## 3. Arquitectura del proyecto

BARLOUNGE utiliza una arquitectura de tres capas:

1. **Capa de presentación:** interfaz desarrollada con React.
2. **Capa de lógica de negocio:** API REST desarrollada con Node.js y Express.
3. **Capa de datos:** base de datos relacional MySQL.

### 3.1 Estructura de carpetas

```text
BARLOUNGE/
│
├── backend/
│   ├── src/
│   │   ├── config/          # Configuración y conexión a MySQL
│   │   ├── controllers/     # Recepción y validación inicial de solicitudes
│   │   ├── middleware/      # Autenticación, permisos y errores
│   │   ├── routes/          # Endpoints de la API
│   │   ├── scripts/         # Scripts de mantenimiento y migración
│   │   ├── services/        # Lógica de negocio y acceso a datos
│   │   ├── utils/           # Cifrado y algoritmos auxiliares
│   │   ├── seed.js          # Datos iniciales de demostración
│   │   └── server.js        # Inicio del servidor Express
│   │
│   ├── .env.example
│   └── package.json
│
├── database/
│   ├── database.sql
│   ├── sprint4.sql
│   └── README_DATABASE.md
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── context/         # Contexto de autenticación
│   │   ├── pages/           # Vistas de la aplicación
│   │   ├── services/        # Comunicación con la API
│   │   ├── styles/          # Hojas de estilos
│   │   └── utils/           # Utilidades y algoritmos
│   │
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## 4. Requisitos para ejecutar el proyecto

Para instalar y ejecutar BARLOUNGE localmente se necesitan:

- Node.js 18 o superior.
- npm.
- MySQL 8 o superior.
- MySQL Workbench u otro cliente para ejecutar y administrar consultas SQL.
- Acceso a una cuenta SMTP si se desea utilizar la recuperación de contraseñas por correo.

---

## 5. Configuración del entorno

### 5.1 Configuración del backend

Desde una terminal de Windows PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

Configura el archivo `backend/.env` con los valores correspondientes a tu entorno local.

**No publiques este archivo ni lo subas a GitHub**, ya que contiene credenciales y claves privadas.

Variables utilizadas por el backend:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto HTTP de Express. El código usa 8080 si no se configura. |
| `FRONTEND_URL` | Origen permitido por la configuración CORS actual. |
| `DB_HOST` | Dirección del servidor MySQL. |
| `DB_PORT` | Puerto de conexión de MySQL. |
| `DB_USER` | Usuario de MySQL. |
| `DB_PASSWORD` | Contraseña del usuario de MySQL. |
| `DB_NAME` | Nombre de la base de datos. Normalmente `barlounge`. |
| `JWT_SECRET` | Secreto utilizado para firmar y verificar JWT. |
| `JWT_EXPIRES_IN` | Duración del JWT según el formato admitido por `jsonwebtoken`. |
| `SMTP_USER` | Cuenta utilizada para enviar códigos de recuperación. |
| `SMTP_PASS` | Credencial SMTP o contraseña de aplicación. |
| `SMTP_FROM` | Remitente mostrado en los correos. |
| `PASSWORD_RECOVERY_MINUTES` | Duración del código de recuperación en minutos. |
| `PASSWORD_RESET_EXPIRES_IN` | Duración del token temporal de restablecimiento. |
| `INVOICE_DATA_ENCRYPTION_KEY` | Clave Base64 de exactamente 32 bytes para AES-256-GCM. |

#### Generar una clave para AES-256-GCM

Ejecuta:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Generar un secreto para JWT

Ejecuta:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copia los valores generados en el archivo `.env` local.

**Importante:** no coloques claves secretas en variables `VITE_*`, porque las variables del frontend se incorporan al código que recibe el navegador.

La clave AES debe protegerse y respaldarse independientemente de la base de datos. Las facturas cifradas solo se pueden descifrar utilizando la clave correspondiente. No reemplaces `INVOICE_DATA_ENCRYPTION_KEY` sin un procedimiento de rotación que descifre con la clave anterior y vuelva a cifrar con la nueva.

### 5.2 Configuración del frontend

Desde otra terminal:

```powershell
cd frontend
Copy-Item .env.example .env
```

Variable disponible:

```env
VITE_API_URL=http://localhost:8080/api
```

En producción se debe utilizar la dirección HTTPS correspondiente a la API.

---

## 6. Base de datos

BARLOUNGE utiliza MySQL como sistema de gestión de base de datos relacional.

Los archivos SQL incluidos en el paquete son:

- `database/database.sql`: esquema base, usuarios, catálogo, inventario, auditoría y recuperación de contraseña.
- `database/sprint4.sql`: estructuras de mesas y pedidos y permisos asociados.

Los archivos SQL originales no constituyen, por sí solos, una migración completa y consolidada para todas las funciones de la versión actual.

El código también utiliza estructuras de caja, comprobantes, consecutivos, sesiones y campos ampliados de sede y factura. Antes de levantar una instalación desde cero, hay que consolidar y validar las migraciones de los sprints posteriores.

### 6.1 Modelo de datos principal

| Tabla | Función |
|---|---|
| `roles` | Almacena los roles del sistema. |
| `permissions` | Contiene los permisos disponibles. |
| `role_permissions` | Relaciona los roles con sus permisos. |
| `sites` | Registra las sedes de BARLOUNGE. |
| `users` | Almacena los usuarios y sus datos de autenticación. |
| `password_recovery_tokens` | Gestiona los códigos de recuperación de contraseña. |
| `auth_sessions` | Registra y controla las sesiones de usuario. |
| `suppliers` | Almacena los proveedores. |
| `product_types` | Clasifica los productos. |
| `products` | Contiene el catálogo general de productos. |
| `inventory` | Registra cantidades y asignaciones de productos por sede. |
| `dining_tables` | Almacena las mesas de cada sede. |
| `bar_orders` | Registra los pedidos. |
| `bar_order_items` | Almacena los productos asociados a cada pedido. |
| `order_payments` | Registra los pagos procesados. |
| `invoices` | Almacena los encabezados de comprobantes internos. |
| `invoice_items` | Conserva el detalle histórico de los comprobantes. |
| `invoice_sequences` | Controla los consecutivos internos por sede. |
| `audit_logs` | Registra las acciones realizadas dentro del sistema. |

### 6.2 Relaciones principales

El modelo operativo de mesas y pedidos utiliza las siguientes relaciones:

```text
SITES
  │
  ├── USERS
  │
  ├── DINING_TABLES
  │       │
  │       └── BAR_ORDERS
  │                │
  │                ├── BAR_ORDER_ITEMS
  │                │
  │                ├── ORDER_PAYMENTS
  │                │       │
  │                │       └── INVOICES
  │                │                │
  │                │                └── INVOICE_ITEMS
  │                │
  │                └── USERS (WAITER)
  │
  ├── INVENTORY
  │       │
  │       └── PRODUCTS
  │
  └── INVOICE_SEQUENCES
```

Otras relaciones:

```text
ROLES
  │
  └── ROLE_PERMISSIONS
          │
          └── PERMISSIONS

USERS
  │
  ├── PASSWORD_RECOVERY_TOKENS
  ├── AUTH_SESSIONS
  └── AUDIT_LOGS

PRODUCT_TYPES
  │
  └── PRODUCTS
          │
          ├── SUPPLIERS
          ├── INVENTORY
          ├── BAR_ORDER_ITEMS
          └── INVOICE_ITEMS
```

En el modelo operativo, las relaciones de mesas y pedidos utilizan `dining_tables`, `bar_orders` y `bar_order_items`.

Las tablas antiguas `bar_tables` y `orders` aparecen en los SQL heredados y no deben confundirse con el conjunto utilizado por las rutas actuales de pedidos.

### 6.3 Instalación de la base de datos

1. Abrir MySQL Workbench.
2. Conectarse al servidor MySQL.
3. Revisar los scripts SQL correspondientes a cada sprint.
4. Crear o seleccionar la base de datos `barlounge`.
5. Ejecutar las estructuras y migraciones en el orden correspondiente.
6. Configurar las credenciales de conexión en `backend/.env`.

**Importante:** una base de datos que ya contiene información no debe sobrescribirse ni recrearse para seguir esta documentación. Primero deben revisarse las migraciones pendientes y respaldarse los datos existentes.

---

## 7. Instalación y ejecución local

### 7.1 Preparar MySQL

1. Crear o seleccionar una instancia local de MySQL.
2. Revisar `database/database.sql` y `database/sprint4.sql`.
3. Completar y validar las migraciones de caja, comprobantes, sesiones y campos de factura requeridos por el código actual.
4. Crear un usuario MySQL exclusivo para BARLOUNGE, con permisos mínimos sobre la base de datos.
5. Configurar las credenciales en `backend/.env`.

Evita utilizar el usuario `root` en un entorno desplegado.

### 7.2 Instalar y ejecutar el backend

Desde la terminal:

```bash
cd backend
npm install
npm run dev
```

Scripts disponibles:

| Comando | Función |
|---|---|
| `npm run dev` | Inicia el servidor utilizando Nodemon. |
| `npm start` | Inicia el servidor. |
| `npm run seed` | Intenta cargar datos iniciales de demostración. |

API local:

```text
http://localhost:8080/api
```

Comprobación de estado:

```text
GET http://localhost:8080/api/health
```

**Advertencia sobre el seed:** en el paquete revisado, `backend/src/seed.js` contiene una entrada mal formada en el arreglo de permisos y entradas repetidas. Debe revisarse y corregirse antes de depender de `npm run seed`.

El archivo también contiene credenciales de demostración. No ejecutes el seed contra datos reales ni utilices esas credenciales en producción.

### 7.3 Instalar y ejecutar el frontend

Abre otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Interfaz local:

```text
http://localhost:5173
```

### 7.4 Compilar el frontend

Para generar la versión de producción:

```bash
npm run build
```

Los archivos compilados se generan en la carpeta `dist`.

---

## 8. Endpoints principales de la API

Todas las rutas se encuentran montadas bajo el prefijo `/api`.

| Recurso | Funcionalidad |
|---|---|
| `/auth` | Inicio de sesión, cierre de sesión, recuperación y cambio de contraseña. |
| `/health` | Comprobación de disponibilidad de la API. |
| `/dashboard` | Información del panel principal. |
| `/users` | Consultar, crear y actualizar usuarios. |
| `/sites` | Consultar, crear y actualizar sedes. |
| `/roles` | Consultar roles. |
| `/products` | Consultar, crear y actualizar productos. |
| `/suppliers` | Consultar, crear y actualizar proveedores. |
| `/product-types` | Consultar, crear y actualizar tipos de producto. |
| `/inventory` | Consultar inventario, incrementar cantidades y administrar asignaciones. |
| `/tables` | Consultar mesas. |
| `/orders` | Consultar, crear, actualizar, guardar y cancelar pedidos. |
| `/cash-register` | Procesar pagos y consultar comprobantes internos. |
| `/reports` | Consultar reportes de ventas, inventario y productos más vendidos. |
| `/audit` | Consultar el historial de auditoría. |

Los métodos HTTP, parámetros y permisos requeridos se encuentran definidos en los archivos de rutas:

```text
backend/src/routes/
```

---

## 9. Algoritmos implementados

BARLOUNGE incorpora seis algoritmos con aplicación en diferentes módulos funcionales.

| Algoritmo | Archivo | Aplicación |
|---|---|---|
| Iterativo | `backend/src/utils/iterativoOrderTotals.js` | Cálculo de cantidades y totales de pedidos. |
| Selección | `frontend/src/utils/selectionSort.js` | Ordenamiento del catálogo de productos. |
| Recursivo | `frontend/src/utils/recursiveProductSearch.js` | Búsqueda binaria recursiva por código de producto. |
| Voraz (Greedy) | `frontend/src/utils/inventoryOptimization.js` | Simulación de selección de lotes según margen potencial y costo. |
| Mochila (Knapsack) | `frontend/src/utils/inventoryOptimization.js` | Simulación de combinación de lotes dentro de un presupuesto mediante Ramificación y Poda. |
| AES-256-GCM | `backend/src/utils/fieldEncryption.js` | Cifrado y descifrado de datos sensibles del comprador en las facturas. |

### 9.1 Algoritmo iterativo

Realiza operaciones repetitivas para calcular cantidades y valores de los productos asociados a los pedidos.

Se utiliza en operaciones de cálculo dentro de la gestión de pedidos y caja.

### 9.2 Algoritmo de selección

Ordena los productos del catálogo comparando sus valores y ubicando el elemento correspondiente en su posición.

Se utiliza para ordenar productos dentro del frontend.

### 9.3 Algoritmo recursivo

Implementa una búsqueda binaria recursiva para localizar productos por su código.

El algoritmo divide progresivamente el intervalo de búsqueda hasta encontrar el producto o determinar que no existe.

### 9.4 Algoritmo Voraz

Selecciona lotes de inventario de acuerdo con su relación entre margen potencial y costo, respetando un presupuesto hipotético.

Su resultado representa una selección rápida basada en decisiones sucesivas.

### 9.5 Algoritmo de la Mochila

Busca una combinación de lotes de inventario que maximice el margen potencial sin superar un presupuesto determinado.

Utiliza la técnica de Ramificación y Poda (Branch and Bound).

Los algoritmos Voraz y Mochila funcionan como simulaciones de análisis. No registran compras, no generan movimientos y no modifican las cantidades reales del inventario.

### 9.6 Cifrado AES-256-GCM

Protege información sensible del comprador asociada a los comprobantes internos.

El cifrado y descifrado se ejecutan en el backend, utilizando una clave privada almacenada en las variables de entorno.

---

## 10. Seguridad de la aplicación

BARLOUNGE incorpora diferentes mecanismos de seguridad para proteger el acceso a la información y las operaciones del sistema.

### 10.1 Autenticación y autorización

- Contraseñas almacenadas mediante `bcryptjs`, no como texto plano.
- Autenticación basada en JWT.
- Sesiones registradas en `auth_sessions`.
- Middleware para verificar autenticación.
- Validación del estado del usuario y de la sesión.
- Control de permisos asociados a roles.
- Restricción de rutas protegidas.
- Control de inactividad de la sesión.

La aplicación cliente implementa cierre de sesión después de tres minutos sin actividad. El backend también verifica la actividad reciente de la sesión.

### 10.2 Protección de consultas SQL

Los servicios revisados utilizan consultas SQL parametrizadas para enviar valores a MySQL.

La parametrización ayuda a prevenir ataques de inyección SQL.

La validación de entradas debe mantenerse en todos los endpoints y servicios que reciban información del usuario.

### 10.3 Cifrado de datos del comprador

El archivo:

```text
backend/src/utils/fieldEncryption.js
```

implementa AES-256-GCM.

Características de la implementación:

- Clave de 32 bytes.
- Clave obtenida desde `INVOICE_DATA_ENCRYPTION_KEY`.
- Vector de inicialización aleatorio de 12 bytes.
- Etiqueta de autenticación GCM de 16 bytes.
- Formato versionado del contenido cifrado.
- Verificación de autenticidad durante el descifrado.

Los datos sensibles del comprador se almacenan en las columnas:

```text
buyer_name_encrypted
buyer_document_encrypted
```

El servicio de caja utiliza las funciones de cifrado y descifrado para guardar y recuperar los datos correspondientes a las facturas.

El proyecto incluye un script para migrar información histórica:

```text
backend/src/scripts/encryptExistingInvoiceData.js
```

La clave AES debe mantenerse privada y respaldarse de forma segura. No debe incluirse en el frontend, en repositorios públicos ni en archivos ZIP de distribución.

### 10.4 Auditoría

La tabla `audit_logs` almacena información sobre las acciones relevantes realizadas dentro del sistema.

Permite registrar:

- Usuario que ejecuta una operación.
- Acción realizada.
- Entidad afectada.
- Identificador del registro.
- Resultado de la operación.
- Fecha y hora.

Las rutas de auditoría requieren autenticación y permiso `AUDIT_READ`.

---

## 11. Evaluación de seguridad basada en OWASP

La revisión del código identifica controles que siguen buenas prácticas de seguridad recomendadas por OWASP.

Sin embargo, **no se puede afirmar que BARLOUNGE cumpla integralmente OWASP Top 10 o que esté certificado**.

La evaluación realizada es una revisión estática preliminar del código. No equivale a una auditoría formal, pruebas de penetración ni una verificación completa de OWASP ASVS.

### 11.1 Controles identificados

| Área | Control identificado |
|---|---|
| Autenticación | JWT y validación de sesiones. |
| Contraseñas | Hash mediante bcrypt. |
| Autorización | Roles y permisos en el backend. |
| Protección de datos | Cifrado AES-256-GCM para datos sensibles del comprador. |
| Base de datos | Consultas parametrizadas en los servicios revisados. |
| Auditoría | Registro de operaciones en `audit_logs`. |
| Inactividad | Control de tiempo de inactividad de la sesión. |
| Integridad relacional | Claves primarias, foráneas y restricciones de base de datos. |

### 11.2 Mejoras de seguridad identificadas

Durante la revisión del paquete se identificaron aspectos que deben corregirse o verificarse antes de un despliegue en producción:

| Hallazgo | Recomendación |
|---|---|
| JWT almacenado en `localStorage`. | Evaluar cookies `HttpOnly`, `Secure` y `SameSite`, o una arquitectura BFF. |
| Sin limitación visible de intentos de autenticación. | Implementar rate limiting en inicio de sesión y recuperación de contraseña. |
| Recuperación de contraseña revela información sobre cuentas existentes. | Utilizar respuestas genéricas para evitar enumeración de usuarios. |
| Validación del certificado SMTP desactivada. | Habilitar la validación del certificado TLS. |
| No se observa configuración de Helmet. | Incorporar cabeceras de seguridad y una política CSP adecuada. |
| Nombre del usuario interpolado en el HTML del correo. | Aplicar escape de caracteres HTML. |
| Restablecimiento de contraseña. | Implementar control de uso único de los tokens y revocación de sesiones existentes al cambiar la contraseña. |
| Dependencias. | Realizar análisis periódico de vulnerabilidades y actualizar paquetes. |
| Pruebas de seguridad. | Incorporar pruebas automatizadas de autenticación, autorización y acceso entre sedes. |

### 11.3 Protección de credenciales

El archivo `.env` contiene información sensible y no debe publicarse.

Antes de compartir el proyecto:

- Retirar archivos `.env` de los paquetes ZIP.
- Mantener los archivos `.env.example` con valores ficticios.
- Rotar credenciales que hayan sido expuestas.
- No compartir claves JWT, AES, SMTP ni credenciales MySQL.
- No utilizar credenciales de demostración en producción.

**Importante sobre la clave AES:** si se necesita reemplazarla, primero se debe planificar la migración de los datos cifrados. Cambiarla directamente puede impedir recuperar los nombres y documentos de las facturas históricas.

### 11.4 Verificación recomendada

Para fortalecer la seguridad del proyecto se recomienda:

1. Ejecutar análisis de dependencias con `npm audit`.
2. Incorporar análisis estático de código.
3. Realizar pruebas dinámicas sobre la API.
4. Verificar el control de acceso entre usuarios y sedes.
5. Probar recuperación de contraseña y expiración de tokens.
6. Verificar que las facturas no expongan datos sensibles en texto plano.
7. Realizar pruebas de penetración antes de un despliegue público.
8. Utilizar OWASP ASVS como lista de verificación técnica.

---

## 12. Recomendaciones para despliegue

Antes de desplegar BARLOUNGE en un entorno productivo:

- Utilizar HTTPS para frontend y backend.
- Mantener las credenciales fuera del código fuente.
- Configurar un usuario MySQL exclusivo para la aplicación.
- Aplicar permisos mínimos sobre la base de datos.
- Realizar copias de seguridad periódicas.
- Probar la restauración de las copias de seguridad.
- Proteger y respaldar la clave AES independientemente de MySQL.
- Configurar correctamente SMTP y validar los certificados TLS.
- Revisar las cabeceras de seguridad HTTP.
- Actualizar periódicamente las dependencias.
- Ejecutar pruebas de seguridad y rendimiento.
- Evitar almacenar contraseñas, JWT o códigos de recuperación en registros de auditoría.

---

## 13. Referencias técnicas

- [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [OWASP Application Security Verification Standard (ASVS) 5.0.0](https://asvs.owasp.org/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Secure Headers Project](https://owasp.org/projects/secure-headers-project/)

---

## 14. Información del proyecto

**Nombre:** BARLOUNGE

**Tipo de aplicación:** Sistema web de gestión administrativa y operativa.

**Arquitectura:** Tres capas (Frontend, Backend y Base de datos).

**Frontend:** React, Vite y React Router.

**Backend:** Node.js y Express.

**Base de datos:** MySQL.

**Seguridad:** JWT, bcrypt, sesiones, roles, permisos, auditoría y AES-256-GCM.

**Documentación:** README técnico del proyecto.

**Alcance de seguridad:** documentación y revisión estática preliminar; no equivale a una certificación OWASP ni a una auditoría de seguridad formal.

---

**BARLOUNGE — Sistema de gestión administrativa y operativa.**