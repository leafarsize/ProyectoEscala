



## DIAGRAMA DE FLUJO DE USUARIOS (ISO
## 9241-210)
## Taller Full Stack


Número de equipo:12

Nombre del Proyecto: Proyecto Escala

Equipo de Desarrollo:
## Herrera Carvajal Ángel Rafael C22400475
Díaz Rodríguez Fernando [No. de control]





























Fase 3: Producir soluciones de diseño (prototipado)

Elaborado por: Díaz Rodríguez Fernando y Herrera Carvajal Ángel Rafael
Los siguientes diagramas describen, paso a paso, los flujos principales de Proyecto Escala: escanear
una hoja de caña, documentar un tratamiento, compartirlo y cerrarlo, y las tareas del jefe de
laboratorio. Cada decisión indica a qué paso regresa o continúa el usuario.

Flujo 1: Escanear el daño de una hoja (Laboratorista)

Objetivo principal del usuario: obtener el porcentaje de daño y el nivel de severidad de una hoja de
caña, y guardarla en un tratamiento.
Flujo paso a paso:
- Inicio: el usuario abre Proyecto Escala en el navegador de su celular.
- Pantalla de bienvenida: se muestra el logo de Escala.
- Decisión 1: ¿El usuario tiene sesión iniciada?
- NO: pantalla de inicio de sesión, ingresa correo y contraseña. Si son incorrectas se muestra
«Usuario o contraseña incorrectos» y permanece en la pantalla (tras 5 intentos fallidos la
cuenta se bloquea 15 minutos). Si son correctas, pasa al punto 4.
- SÍ: continúa directamente al punto 4.
- Pantalla de inicio: el usuario ve sus tratamientos abiertos y el botón (Escanear hoja).
- Acción 1: toca (Escanear hoja) ,desde la laptop también puede elegir (Importar imagen).
- Decisión 2: ¿El navegador tiene permiso para usar la cámara?
NO: se muestra un mensaje con instrucciones para habilitar el permiso, regresa al punto 4.
SÍ: continúa al punto 7.
- Captura guiada: alinea la hoja con el recuadro y la retícula, sobre fondo blanco y a 30 cm, y
toma la foto.
- Vista previa: revisa la foto; puede recortarla o rotarla.
- (Repetir captura): regresa al punto 7.


- «Analizar»: continúa al punto 9.
- Procesamiento: se muestra (Analizando hoja); el sistema separa la hoja del fondo, detecta
las lesiones y calcula el porcentaje de área afectada.
- Decisión 3: ¿Se detectó la hoja y se obtuvo un resultado válido?
- NO: se muestra (No se detectó la hoja, toma la foto de nuevo), regresa al punto 7. Si el
problema fue la conexión, se conserva la foto y se ofrece «Reintentar».
- SÍ: continúa al punto 11.
- Resultado: imagen con las lesiones resaltadas, porcentaje de daño, nivel de severidad de 0 a
5 y su etiqueta (por ejemplo, Nivel 2 = Moderado bajo). El escaneo queda guardado en el
historial.
- Decisión 4: ¿Agregar el escaneo a un tratamiento?
- NO: toca (Volver al inicio), regresa al punto 4.
- SÍ: toca (Agregar a tratamiento), elige un tratamiento abierto de la lista y toca (Guardar).
- Pantalla de éxito: mensaje (Escaneo guardado) con los botones (Ver estadísticas del
tratamiento) y (Escanear siguiente)


## .



Flujo 2: Crear tratamiento y registrar un avance (Laboratorista)

Objetivo principal del usuario: abrir un nuevo tratamiento y documentar su primer avance.
Flujo paso a paso:
- Inicio: el usuario abre Proyecto Escala e inicia sesión (igual que en el Flujo 1).
- Pantalla de inicio: se muestran sus tratamientos.
- Acción 1: toca (Nuevo tratamiento).
- Formulario: escribe nombre, variedad de caña, lote o parcela, fecha de inicio y condiciones
del ensayo; puede adjuntar fotos o documentos.
- Decisión 1: ¿Están completos los campos obligatorios?
- NO: el botón (Guardar) permanece desactivado , sigue llenando el formulario.
- SÍ: toca (Guardar).
- Detalle del tratamiento: se muestra el cronograma vacío y el estado (Abierto).
- Acción 2: toca (Agregar avance).
- Captura del avance: toma una o varias fotos y/o escribe una nota por ejemplo, (Disminución
de pústulas en el tercio medio); puede vincular un escaneo. La fecha se registra sola.
- Decisión 2: ¿Hay al menos una foto o una nota?
- NO: el botón (Guardar avance) permanece desactivado = regresa al punto 8.
- SÍ: toca (Guardar avance).
- Pantalla de éxito: aviso (Avance guardado) y el avance aparece en el cronograma del
tratamiento.









Flujo 3: Dar acceso temporal y cerrar un tratamiento (Laboratorista)

Objetivo principal del usuario: que otro laboratorista ayude a documentar el tratamiento y, al
terminar, cerrarlo.
Flujo paso a paso:
- Inicio: el usuario abre Proyecto Escala con sesión iniciada.
- Pantalla de inicio: toca uno de sus tratamientos abiertos.
- Detalle del tratamiento: ve el cronograma de avances y escaneos.
- Decisión 1: ¿Qué desea hacer?
- DAR ACCESO: continúa al punto 5.
- CERRAR TRATAMIENTO: continúa al punto 8.
- Acción 1: toca (Accesos), (Agregar), elige al laboratorista y una fecha de expiración.
- Decisión 2: ¿La fecha de expiración es futura?
- NO: el botón, (Guardar) permanece desactivado y se indica el error junto al campo.
- SÍ: toca (Guardar).
- Éxito: el laboratorista aparece en la lista de accesos, regresa al detalle del tratamiento.
- Acción 2: toca (Cerrar tratamiento).
- Confirmación: se muestra,(¿Estás seguro de cerrar este tratamiento? Ya no podrás agregar
fotos, notas ni modificaciones.)
- Decisión 3: ¿Confirma el cierre?
- NO: toca, (Cancelar), regresa al detalle del tratamiento.
- SÍ: toca (Sí, cerrar).
- Pantalla de éxito: el tratamiento queda con la etiqueta (Cerrado), sin botones para agregar o
editar, y con el botón (Volver al inicio).















Flujo 4: Crear laboratorista y revisar tratamientos (Jefe de laboratorio)

Objetivo principal del usuario: dar de alta a un nuevo laboratorista y supervisar los tratamientos del
laboratorio.
Flujo paso a paso:
- Inicio: el jefe de laboratorio abre Proyecto Escala e inicia sesión (igual que en el Flujo 1).
- Vista general: se muestran los tratamientos de todos los laboratoristas.
- Decisión 1: ¿Qué desea hacer?
- CREAR USUARIO: continúa al punto 4.
- REVISAR TRATAMIENTOS: continúa al punto 7.
- Acción 1: toca (Usuarios) , (Nuevo laboratorista) y escribe nombre, correo y contraseña
temporal.
- Decisión 2: ¿El correo ya está registrado?
- SÍ: aparece junto al campo (Este correo ya existe), regresa al punto 4.
- NO: toca (Guardar).
- Éxito: mensaje (Usuario creado); el laboratorista aparece en la lista y deberá cambiar su
contraseña en el primer acceso.
- Acción 2: filtra los tratamientos por laboratorista, variedad o estado (abierto / cerrado).
- Detalle del tratamiento (solo lectura): ve avances, escaneos y estadísticas de severidad.
No aparece la opción de eliminar comentarios.
- Fin: toca (Volver) para regresar a la vista general.














Pantallas del prototipo (wireframes)

El prototipo de baja fidelidad contempla las siguientes pantallas, que cubren los cuatro flujos
anteriores:
- Consulta de tratamientos: tabla con tratamiento, variedad, lote, estado, daño inicial último,
equipo y última nota; filtros por estado y pestañas (Míos) / (Compartidos conmigo).
- Nuevo tratamiento: nombre, variedad, lote, fecha de inicio, escaneo inicial, condiciones y
notas, y adjuntos (JPG, PNG, PDF).
- Agregar avance: fecha automática, título, nota, fotos y vinculación de un escaneo.
- Editar avance: solo para avances propios; el cambio queda marcado como (editado) con
fecha.
- Escanear hoja: visor de cámara con recuadro de alineación, retícula e indicador (Analizando
hoja...).
- Agregar escaneo a un tratamiento: lista de los tratamientos abiertos a los que el usuario
tiene acceso.
- Estadísticas: comparativa antes vs. después y evolución del porcentaje de daño del
tratamiento.
- Crear usuario (jefe de laboratorio): nombre completo, correo y contraseña temporal con
botón «Generar».


## Login:

## Laboratorista :
























Jefe laboratorio:



